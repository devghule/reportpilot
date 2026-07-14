import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { decrypt, encrypt } from '../common/crypto.util';
import { MetaImportDto } from './dto/meta-import.dto';
import {
  BASE_FIELDS,
  META_GRAPH_URL,
  METRIC_FIELD_MAP,
  TIME_INCREMENT_MAP,
} from './meta.constants';

interface GraphRow {
  [key: string]: unknown;
}

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ---------------------------------------------------------------------
  // 6.1 Meta OAuth Flow
  // ---------------------------------------------------------------------

  getAuthUrl(userId: string): { url: string } {
    const params = new URLSearchParams({
      client_id: this.config.get<string>('META_APP_ID') as string,
      redirect_uri: this.config.get<string>('META_REDIRECT_URI') as string,
      scope: 'ads_read,ads_management,business_management,read_insights',
      response_type: 'code',
      state: userId,
    });
    return { url: `https://www.facebook.com/${'v18.0'}/dialog/oauth?${params}` };
  }

  async handleCallback(userId: string, code: string) {
    const appId = this.config.get<string>('META_APP_ID');
    const appSecret = this.config.get<string>('META_APP_SECRET');
    const redirectUri = this.config.get<string>('META_REDIRECT_URI');

    // Step 1: exchange code for a short-lived token.
    const shortLived = await this.graphGet<{ access_token: string }>(
      `${META_GRAPH_URL}/oauth/access_token`,
      { client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code },
    );

    // Step 2: exchange short-lived for a long-lived token (~60 days).
    const longLived = await this.graphGet<{
      access_token: string;
      expires_in: number;
    }>(`${META_GRAPH_URL}/oauth/access_token`, {
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortLived.access_token,
    });

    const accessToken = longLived.access_token;
    const tokenExpiresAt = new Date(
      Date.now() + (longLived.expires_in ?? 60 * 24 * 60 * 60) * 1000,
    );

    // Step 3: fetch Business Managers and the ad accounts under each.
    const businesses = await this.graphGet<{ data: { id: string; name: string }[] }>(
      `${META_GRAPH_URL}/me/businesses`,
      { fields: 'id,name', access_token: accessToken },
    );

    const accounts: {
      bmId: string;
      bmName: string;
      adAccounts: { id: string; name: string; currency: string }[];
    }[] = [];

    for (const business of businesses.data ?? []) {
      // Ad accounts an agency/marketer manages are usually shared as a
      // "client" account, not "owned" — owned_ad_accounts alone misses these
      // entirely (a very common setup), so the account picker would show
      // nothing after an apparently successful Meta connect. Fetch both
      // edges and dedupe by id.
      const [owned, client] = await Promise.all([
        this.graphGet<{ data: { id: string; name: string; currency: string }[] }>(
          `${META_GRAPH_URL}/${business.id}/owned_ad_accounts`,
          { fields: 'id,name,currency', access_token: accessToken },
        ),
        this.graphGet<{ data: { id: string; name: string; currency: string }[] }>(
          `${META_GRAPH_URL}/${business.id}/client_ad_accounts`,
          { fields: 'id,name,currency', access_token: accessToken },
        ),
      ]);

      const adAccountsById = new Map<string, { id: string; name: string; currency: string }>();
      for (const adAccount of [...(owned.data ?? []), ...(client.data ?? [])]) {
        adAccountsById.set(adAccount.id, adAccount);
      }
      const adAccountList = Array.from(adAccountsById.values());

      accounts.push({
        bmId: business.id,
        bmName: business.name,
        adAccounts: adAccountList,
      });

      for (const adAccount of adAccountList) {
        await this.prisma.connectedAccount.upsert({
          where: {
            userId_metaAccountId: { userId, metaAccountId: adAccount.id },
          },
          create: {
            userId,
            metaBmId: business.id,
            metaBmName: business.name,
            metaAccountId: adAccount.id,
            metaAccountName: adAccount.name,
            currency: adAccount.currency,
            accessToken: encrypt(accessToken),
            tokenExpiresAt,
          },
          update: {
            metaAccountName: adAccount.name,
            currency: adAccount.currency,
            accessToken: encrypt(accessToken),
            tokenExpiresAt,
          },
        });
      }
    }

    const totalAdAccounts = accounts.reduce((sum, bm) => sum + bm.adAccounts.length, 0);
    this.logger.log(
      `Meta connected: userId=${userId}, businessManagers=${accounts.length}, adAccounts=${totalAdAccounts}`,
    );
    return { success: true, accounts };
  }

  // ---------------------------------------------------------------------
  // Account listing
  // ---------------------------------------------------------------------

  async listAccounts(userId: string) {
    const rows = await this.prisma.connectedAccount.findMany({ where: { userId } });
    const byBm = new Map<
      string,
      { bmId: string; bmName: string; adAccounts: { id: string; name: string; currency: string }[] }
    >();

    for (const row of rows) {
      if (!byBm.has(row.metaBmId)) {
        byBm.set(row.metaBmId, { bmId: row.metaBmId, bmName: row.metaBmName, adAccounts: [] });
      }
      // `id` here is the ConnectedAccount row's own primary key, not Meta's
      // account id (metaAccountId) — every other endpoint (import, ai,
      // schedules, disconnect) looks accounts up by this DB id, so the
      // listing must return the same id or those lookups silently 404.
      byBm.get(row.metaBmId)!.adAccounts.push({
        id: row.id,
        name: row.metaAccountName,
        currency: row.currency,
      });
    }

    return Array.from(byBm.values());
  }

  async listAdAccounts(userId: string, bmId: string) {
    const rows = await this.prisma.connectedAccount.findMany({
      where: { userId, metaBmId: bmId },
    });
    // Same fix as listAccounts() — `id` must be the DB row id, not metaAccountId.
    return rows.map((row) => ({
      id: row.id,
      name: row.metaAccountName,
      currency: row.currency,
    }));
  }

  async disconnect(userId: string, accountId: string) {
    const account = await this.prisma.connectedAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) {
      throw new NotFoundException('Connected account not found.');
    }
    await this.prisma.connectedAccount.delete({ where: { id: account.id } });
    return { success: true };
  }

  // ---------------------------------------------------------------------
  // 8. Import flow
  // ---------------------------------------------------------------------

  async import(userId: string, dto: MetaImportDto) {
    const template = await this.prisma.template.findFirst({
      where: { id: dto.templateId, userId },
    });
    if (!template) {
      throw new NotFoundException('Template not found.');
    }

    const account = await this.prisma.connectedAccount.findFirst({
      where: { id: dto.accountId, userId },
    });
    if (!account) {
      throw new NotFoundException('Connected account not found.');
    }

    const accessToken = decrypt(account.accessToken);
    const fields = this.buildFields(template.metrics, template.reportLevel);

    const [currentRows, previousRows] = await Promise.all([
      this.fetchInsights(account.metaAccountId, accessToken, fields, template, dto.dateRange),
      this.fetchInsights(account.metaAccountId, accessToken, fields, template, dto.prevDateRange),
    ]);

    let currentMerged = currentRows;
    if (template.reportLevel === 'ad') {
      const creativeMap = await this.fetchCreatives(account.metaAccountId, accessToken);
      currentMerged = currentRows.map((row) => ({
        ...row,
        ...(creativeMap.get(row.ad_id as string) ?? {}),
      }));
    }

    const dimensionKey = this.dimensionKeyFor(template.reportLevel);
    const combined = this.applyPeriodComparison(currentMerged, previousRows, dimensionKey);

    const orderedRows = this.orderColumns(combined, template.columnOrder);
    const sortedRows = this.sortRows(
      orderedRows,
      template.columnOrder,
      template.sortBy,
      template.sortDirection,
    );

    this.logger.log(
      `Import completed: userId=${userId}, accountId=${account.id}, templateId=${template.id}, rows=${sortedRows.length}`,
    );

    return {
      accountName: account.metaAccountName,
      reportLevel: template.reportLevel,
      headers: template.columnOrder,
      rows: sortedRows,
      currency: account.currency,
      dateRange: `${dto.dateRange.since} to ${dto.dateRange.until}`,
      prevDateRange: `${dto.prevDateRange.since} to ${dto.prevDateRange.until}`,
    };
  }

  private buildFields(metrics: string[], reportLevel: string): string[] {
    const fieldSet = new Set<string>(BASE_FIELDS);
    for (const metric of metrics) {
      for (const field of METRIC_FIELD_MAP[metric] ?? []) {
        fieldSet.add(field);
      }
    }
    if (reportLevel === 'ad') {
      fieldSet.add('ad_id');
    }
    return Array.from(fieldSet);
  }

  private dimensionKeyFor(reportLevel: string): string {
    if (reportLevel === 'ad') return 'ad_id';
    if (reportLevel === 'adset') return 'adset_name';
    return 'campaign_name';
  }

  private async fetchInsights(
    metaAccountId: string,
    accessToken: string,
    fields: string[],
    template: { reportLevel: string; dateGranularity: string; filters: unknown },
    dateRange: { since: string; until: string },
  ): Promise<GraphRow[]> {
    const rows: GraphRow[] = [];
    let url: string | null = `${META_GRAPH_URL}/${metaAccountId}/insights`;
    let params: Record<string, unknown> | undefined = {
      fields: fields.join(','),
      time_range: JSON.stringify(dateRange),
      level: template.reportLevel,
      time_increment: TIME_INCREMENT_MAP[template.dateGranularity] ?? 1,
      filtering: template.filters ? JSON.stringify(template.filters) : undefined,
      limit: 500,
      access_token: accessToken,
    };

    while (url) {
      const data = await this.graphGet<{
        data: GraphRow[];
        paging?: { next?: string };
      }>(url, params);
      rows.push(...(data.data ?? []));
      url = data.paging?.next ?? null;
      params = undefined; // paging.next already contains all query params
    }

    return rows;
  }

  private async fetchCreatives(
    metaAccountId: string,
    accessToken: string,
  ): Promise<Map<string, Record<string, unknown>>> {
    const map = new Map<string, Record<string, unknown>>();
    let url: string | null = `${META_GRAPH_URL}/${metaAccountId}/ads`;
    let params: Record<string, unknown> | undefined = {
      fields: 'id,name,creative{title,body,image_url,thumbnail_url}',
      limit: 500,
      access_token: accessToken,
    };

    while (url) {
      const data = await this.graphGet<{
        data: { id: string; creative?: Record<string, unknown> }[];
        paging?: { next?: string };
      }>(url, params);
      for (const ad of data.data ?? []) {
        map.set(ad.id, {
          ad_creative_title: ad.creative?.title,
          ad_creative_body: ad.creative?.body,
          ad_creative_image: ad.creative?.image_url ?? ad.creative?.thumbnail_url,
        });
      }
      url = data.paging?.next ?? null;
      params = undefined;
    }

    return map;
  }

  private applyPeriodComparison(
    current: GraphRow[],
    previous: GraphRow[],
    dimensionKey: string,
  ): GraphRow[] {
    const previousByKey = new Map<string, GraphRow>();
    for (const row of previous) {
      const key = row[dimensionKey] as string | undefined;
      if (key) previousByKey.set(key, row);
    }

    return current.map((row) => {
      const key = row[dimensionKey] as string | undefined;
      const prevRow = key ? previousByKey.get(key) : undefined;
      const currentSpend = Number(row.spend ?? 0);
      const prevSpend = Number(prevRow?.spend ?? 0);
      const periodChange =
        prevSpend > 0
          ? (((currentSpend - prevSpend) / prevSpend) * 100).toFixed(1) + '%'
          : 'N/A';
      return { ...row, period_change: periodChange };
    });
  }

  private orderColumns(rows: GraphRow[], columnOrder: string[]): string[][] {
    return rows.map((row) =>
      columnOrder.map((field) => {
        const value = row[field];
        return value === undefined || value === null ? '' : String(value);
      }),
    );
  }

  private sortRows(
    rows: string[][],
    columnOrder: string[],
    sortBy?: string | null,
    sortDirection?: string | null,
  ): string[][] {
    if (!sortBy) return rows;
    const index = columnOrder.indexOf(sortBy);
    if (index === -1) return rows;

    const direction = sortDirection === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => {
      const aVal = Number(a[index]);
      const bVal = Number(b[index]);
      if (!Number.isNaN(aVal) && !Number.isNaN(bVal)) {
        return (aVal - bVal) * direction;
      }
      return a[index].localeCompare(b[index]) * direction;
    });
  }

  // ---------------------------------------------------------------------
  // 6.3 Token refresh (automated, daily at 2 AM)
  // ---------------------------------------------------------------------

  @Cron('0 2 * * *')
  async refreshExpiringTokens() {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const accounts = await this.prisma.connectedAccount.findMany({
      where: { tokenExpiresAt: { lte: sevenDaysFromNow } },
    });

    for (const account of accounts) {
      try {
        const rawToken = decrypt(account.accessToken);
        const refreshed = await this.graphGet<{
          access_token: string;
          expires_in: number;
        }>(`${META_GRAPH_URL}/oauth/access_token`, {
          grant_type: 'fb_exchange_token',
          client_id: this.config.get<string>('META_APP_ID'),
          client_secret: this.config.get<string>('META_APP_SECRET'),
          fb_exchange_token: rawToken,
        });

        await this.prisma.connectedAccount.update({
          where: { id: account.id },
          data: {
            accessToken: encrypt(refreshed.access_token),
            tokenExpiresAt: new Date(
              Date.now() + (refreshed.expires_in ?? 60 * 24 * 60 * 60) * 1000,
            ),
          },
        });
      } catch (err) {
        this.logger.error(
          `Failed to refresh Meta token for account ${account.id}`,
          err instanceof Error ? err.stack : undefined,
        );
      }
    }
  }

  // ---------------------------------------------------------------------
  // Graph API helper — retries once on rate limit (code 17 / 613)
  // ---------------------------------------------------------------------

  private async graphGet<T>(
    url: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    try {
      const response = await axios.get<T>(url, { params });
      return response.data;
    } catch (err) {
      const code = axios.isAxiosError(err)
        ? err.response?.data?.error?.code
        : undefined;

      // Code 190 = OAuthException, the token was revoked or expired on
      // Meta's side (e.g. user removed the app's access from Facebook
      // settings). This is not retryable — the user must reconnect. 401 lets
      // the frontend distinguish this from a generic import failure and
      // prompt reconnect specifically, rather than showing a dead-end error.
      if (code === 190) {
        throw new UnauthorizedException(
          'Your Meta connection expired. Click Reconnect.',
        );
      }

      if (code === 17 || code === 613) {
        await new Promise((resolve) => setTimeout(resolve, 60_000));
        try {
          const retry = await axios.get<T>(url, { params });
          return retry.data;
        } catch {
          throw new BadRequestException(
            'Meta is temporarily limiting requests. Retrying in 60 seconds.',
          );
        }
      }

      if (axios.isAxiosError(err) && err.response?.status === 404) {
        throw new BadRequestException('Could not reach Meta. Try again in a few minutes.');
      }

      throw new BadRequestException(
        axios.isAxiosError(err)
          ? (err.response?.data?.error?.message ?? 'Meta API request failed.')
          : 'Meta API request failed.',
      );
    }
  }
}
