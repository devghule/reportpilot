import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';
import { decrypt } from '../common/crypto.util';

interface ReportData {
  accountName: string;
  headers: string[];
  rows: string[][];
  dateRange: string;
  prevDateRange: string;
}

@Injectable()
export class SheetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async writeTest(userId: string, sheetId: string, value: string) {
    const account = await this.prisma.connectedAccount.findFirst({
      where: { userId, googleRefToken: { not: null } },
    });

    if (!account?.googleRefToken) {
      throw new BadRequestException(
        'Could not write to your sheet. Check that ReportPilot still has access.',
      );
    }

    const sheets = this.getSheetsClient(account.googleRefToken);

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'A1',
      valueInputOption: 'RAW',
      requestBody: { values: [[value]] },
    });

    return { success: true };
  }

  // 9.6 — Google Sheets API write (backend, used by the scheduling engine).
  // values.update only touches the given range — preserves formatting and any
  // user edits made outside it.
  async writeReport(
    googleRefToken: string,
    sheetId: string,
    sheetTabName: string,
    data: ReportData,
  ) {
    if (!googleRefToken) {
      throw new BadRequestException(
        'Could not write to your sheet. Check that ReportPilot still has access.',
      );
    }

    const sheets = this.getSheetsClient(googleRefToken);
    const metadataRow = [
      `${data.accountName} | Period: ${data.dateRange} vs ${data.prevDateRange} | Auto-refreshed: ${new Date().toISOString()}`,
    ];

    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${sheetTabName}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [metadataRow, data.headers, ...data.rows] },
      });
    } catch (err) {
      throw new BadRequestException(
        `The tab '${sheetTabName}' could not be found in this sheet, or the sheet is no longer accessible.`,
      );
    }
  }

  private getSheetsClient(encryptedGoogleRefToken: string) {
    const oauth2Client = new google.auth.OAuth2(
      this.config.get<string>('GOOGLE_CLIENT_ID'),
      this.config.get<string>('GOOGLE_CLIENT_SECRET'),
    );
    oauth2Client.setCredentials({
      refresh_token: decrypt(encryptedGoogleRefToken),
    });
    return google.sheets({ version: 'v4', auth: oauth2Client });
  }
}
