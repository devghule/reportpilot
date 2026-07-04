export interface User {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  avatarUrl: string | null;
}

export interface ConnectedAccount {
  id: string;
  metaBmId: string;
  metaBmName: string;
  metaAccountId: string;
  metaAccountName: string;
  currency: string;
}

export interface BusinessManagerGroup {
  bmId: string;
  bmName: string;
  adAccounts: { id: string; name: string; currency: string }[];
}

export interface Template {
  id: string;
  name: string;
  reportLevel: 'campaign' | 'adset' | 'ad';
  dateGranularity: 'day' | 'week' | 'month';
  dateRange: string;
  metrics: string[];
  dimensions: string[];
  columnOrder: string[];
  sortBy: string | null;
  sortDirection: 'asc' | 'desc' | null;
  filters: unknown;
  isPrebuilt: boolean;
}

export interface Schedule {
  id: string;
  templateId: string;
  accountId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  refreshTime: string;
  timezone: string;
  status: 'active' | 'paused' | 'disabled';
  sheetId: string;
  sheetTabName: string;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastError: string | null;
  nextRunAt: string | null;
  lastRunDisplay: string | null;
  nextRunDisplay: string | null;
  template?: Template;
  account?: ConnectedAccount;
}

export interface ImportResult {
  accountName: string;
  reportLevel: string;
  headers: string[];
  rows: string[][];
  currency: string;
  dateRange: string;
  prevDateRange: string;
}

export interface AiInsightResult {
  id: string;
  performanceSummary: string;
  creativeFatigue: string;
  budgetWaste: string;
  scalingOpp: string;
}

export interface SheetData {
  campaigns?: { headers: string[]; rows: string[][] };
  ad_sets?: { headers: string[]; rows: string[][] };
  ads?: { headers: string[]; rows: string[][] };
}
