import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { AiGenerateDto } from './dto/ai-generate.dto';
import { AiFeedbackDto } from './dto/ai-feedback.dto';
import {
  AI_SECTION_HEADINGS,
  LOW_SPEND_THRESHOLD,
  MAX_ROWS_BEFORE_AGGREGATION,
  TOP_CAMPAIGNS_WHEN_AGGREGATED,
  buildPrompt,
} from './ai.constants';

interface TabData {
  headers: string[];
  rows: string[][];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai?: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // Built lazily so a missing OPENAI_API_KEY only breaks AI endpoints,
  // not the entire app's startup.
  private getClient(): OpenAI {
    if (!this.openai) {
      const apiKey = this.config.get<string>('OPENAI_API_KEY');
      if (!apiKey) {
        throw new BadRequestException('AI insights are unavailable right now. Try again in a few minutes.');
      }
      this.openai = new OpenAI({ apiKey });
    }
    return this.openai;
  }

  async generate(userId: string, dto: AiGenerateDto) {
    const account = await this.prisma.connectedAccount.findFirst({
      where: { id: dto.accountId, userId },
    });
    if (!account) {
      throw new NotFoundException('Connected account not found.');
    }

    const campaigns = dto.reportData.campaigns;
    if (!campaigns || campaigns.rows.length === 0) {
      throw new BadRequestException('Import your campaign data first, then generate insights.');
    }

    const { campaigns: campaignsToUse, adsets, ads, aggregationNote } =
      this.applyContextWindowManagement(dto.reportData);

    const totalSpend = this.sumColumn(campaignsToUse, /spend/i);
    const lowSpendNote =
      totalSpend > 0 && totalSpend < LOW_SPEND_THRESHOLD
        ? 'Note: spend is very low. Insights may be limited.'
        : undefined;

    const dateRange = dto.dateRange ?? 'the selected period';
    const prevDateRange = dto.prevDateRange ?? 'the previous period';

    const prompt = buildPrompt({
      accountName: account.metaAccountName,
      currency: account.currency,
      dateRange,
      prevDateRange,
      campaignText: this.formatTabAsText(campaignsToUse),
      adsetText: this.formatTabAsText(adsets),
      adText: this.formatTabAsText(ads),
      aggregationNote,
      lowSpendNote,
    });

    let rawOutput: string;
    try {
      const completion = await this.getClient().chat.completions.create(
        {
          model: 'gpt-4',
          max_tokens: 1000,
          temperature: 0.3,
          messages: [{ role: 'user', content: prompt }],
        },
        { timeout: 30_000 },
      );
      rawOutput = completion.choices[0]?.message?.content ?? '';
    } catch (err: unknown) {
      // Never log `err` directly here — the OpenAI SDK's error objects can
      // include the request body, which would put campaign data (and
      // potentially the API key on some error shapes) into application logs.
      const isTimeout =
        err instanceof Error &&
        (err.name === 'APIConnectionTimeoutError' || (err as { code?: string }).code === 'ETIMEDOUT');
      this.logger.warn(`AI generation failed for account ${account.id}${isTimeout ? ' (timeout)' : ''}`);
      if (isTimeout) {
        throw new BadRequestException('Analysis is taking longer than expected. Please try again.');
      }
      throw new BadRequestException('AI insights are unavailable right now. Try again in a few minutes.');
    }

    const parsed = this.parseSections(rawOutput);

    const aiReport = await this.prisma.aiReport.create({
      data: {
        userId,
        accountId: account.id,
        accountName: account.metaAccountName,
        reportData: dto.reportData as unknown as Prisma.InputJsonValue,
        promptUsed: prompt,
        insightOutput: rawOutput,
      },
    });
    this.logger.log(`AI insight ${aiReport.id} generated for account ${account.id}`);

    return {
      id: aiReport.id,
      performanceSummary: parsed.performanceSummary,
      creativeFatigue: parsed.creativeFatigue,
      budgetWaste: parsed.budgetWaste,
      scalingOpp: parsed.scalingOpp,
    };
  }

  async feedback(userId: string, dto: AiFeedbackDto) {
    const report = await this.prisma.aiReport.findFirst({
      where: { id: dto.aiReportId, userId },
    });
    if (!report) {
      throw new NotFoundException('AI report not found.');
    }
    await this.prisma.aiReport.update({
      where: { id: report.id },
      data: { feedback: dto.feedback },
    });
    return { success: true };
  }

  async history(userId: string) {
    return this.prisma.aiReport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  // ---------------------------------------------------------------------
  // 10.5 Context window management
  // ---------------------------------------------------------------------

  private applyContextWindowManagement(reportData: AiGenerateDto['reportData']) {
    const campaigns = reportData.campaigns ?? { headers: [], rows: [] };
    const adsets = reportData.ad_sets ?? { headers: [], rows: [] };
    const ads = reportData.ads ?? { headers: [], rows: [] };

    const totalRows = campaigns.rows.length + adsets.rows.length + ads.rows.length;
    if (totalRows <= MAX_ROWS_BEFORE_AGGREGATION) {
      return { campaigns, adsets, ads, aggregationNote: undefined as string | undefined };
    }

    const spendIndex = campaigns.headers.findIndex((h) => /spend/i.test(h));
    const sortedCampaigns =
      spendIndex === -1
        ? campaigns.rows
        : [...campaigns.rows].sort(
            (a, b) => (Number(b[spendIndex]) || 0) - (Number(a[spendIndex]) || 0),
          );

    return {
      campaigns: {
        headers: campaigns.headers,
        rows: sortedCampaigns.slice(0, TOP_CAMPAIGNS_WHEN_AGGREGATED),
      },
      adsets: { headers: [], rows: [] },
      ads: { headers: [], rows: [] },
      aggregationNote: 'Data has been summarised to top 20 campaigns by spend.',
    };
  }

  private sumColumn(tab: TabData, headerPattern: RegExp): number {
    const index = tab.headers.findIndex((h) => headerPattern.test(h));
    if (index === -1) return 0;
    return tab.rows.reduce((sum, row) => sum + (Number(row[index]) || 0), 0);
  }

  private formatTabAsText(tab: TabData): string {
    if (!tab.rows.length) return 'No data available.';
    const lines = tab.rows.map((row) =>
      tab.headers.map((header, i) => `${header}: ${row[i] ?? ''}`).join(', '),
    );
    return lines.join('\n');
  }

  // ---------------------------------------------------------------------
  // Defensive parsing of the 4-section GPT-4 output
  // ---------------------------------------------------------------------

  private parseSections(rawOutput: string) {
    const sectionRegex = new RegExp(
      `(${AI_SECTION_HEADINGS.join('|')})\\s*\\n([\\s\\S]*?)(?=(?:${AI_SECTION_HEADINGS.join('|')})|$)`,
      'g',
    );

    const sections: Record<string, string> = {};
    let match: RegExpExecArray | null;
    while ((match = sectionRegex.exec(rawOutput)) !== null) {
      sections[match[1]] = match[2].trim();
    }

    const foundAny = Object.keys(sections).length > 0;

    if (!foundAny) {
      // GPT-4 didn't follow the 4-section format — fall back to raw output.
      return {
        performanceSummary: rawOutput.trim(),
        creativeFatigue: '',
        budgetWaste: '',
        scalingOpp: '',
      };
    }

    return {
      performanceSummary: sections['PERFORMANCE SUMMARY'] ?? '',
      creativeFatigue: sections['CREATIVE FATIGUE ALERT'] ?? '',
      budgetWaste: sections['BUDGET WASTE ALERT'] ?? '',
      scalingOpp: sections['SCALING OPPORTUNITY'] ?? '',
    };
  }
}
