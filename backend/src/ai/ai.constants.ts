export const AI_SECTION_HEADINGS = [
  'PERFORMANCE SUMMARY',
  'CREATIVE FATIGUE ALERT',
  'BUDGET WASTE ALERT',
  'SCALING OPPORTUNITY',
] as const;

export const MAX_ROWS_BEFORE_AGGREGATION = 200;
export const TOP_CAMPAIGNS_WHEN_AGGREGATED = 20;
export const LOW_SPEND_THRESHOLD = 500;

export function buildPrompt(params: {
  accountName: string;
  currency: string;
  dateRange: string;
  prevDateRange: string;
  campaignText: string;
  adsetText: string;
  adText: string;
  aggregationNote?: string;
  lowSpendNote?: string;
}): string {
  const notes = [params.aggregationNote, params.lowSpendNote].filter(Boolean).join(' ');

  return `You are a Meta Ads performance analyst. Analyse the campaign data below and write
a structured plain-English performance report for a marketing client.

The client is NOT technical. Do not use jargon. Do not explain what metrics mean.
Be direct, specific, and actionable. Use the actual numbers from the data.

AD ACCOUNT: ${params.accountName}
CURRENCY: ${params.currency}
REPORT PERIOD: ${params.dateRange}
PREVIOUS PERIOD: ${params.prevDateRange}
${notes ? `\n${notes}\n` : ''}
CAMPAIGN DATA:
${params.campaignText}

AD SET DATA:
${params.adsetText}

AD LEVEL DATA (with creative details):
${params.adText}

Produce exactly 4 sections using these exact headings.
Do not add any other sections.

PERFORMANCE SUMMARY
2 to 3 sentences. State total spend, total leads or conversions, average CPL
or CPA. State whether performance improved or declined vs the previous period
with exact % change.

CREATIVE FATIGUE ALERT
Look for ads where frequency is above 3.5 AND CTR has declined vs previous period.
If found: name the specific ad, the ad set it belongs to, state the current
frequency, state the CTR change, and recommend pausing and replacing the creative.
If none found: write exactly "No creative fatigue detected this period."

BUDGET WASTE ALERT
Look for any campaign or ad set that spent more than ${params.currency} 1000 with zero
leads or zero conversions in this period.
If found: name it, state the exact amount wasted, recommend pausing it.
If multiple found: list all of them.
If none found: write exactly "No budget waste detected this period."

SCALING OPPORTUNITY
Find the campaign or ad set with the lowest CPL or CPA that is at least 20%
below the account average CPL or CPA.
If found: name it, state its CPL vs account average, recommend a specific %
budget increase.
If none found: write exactly "No clear scaling opportunity this period."

Keep the total output under 350 words. No bullet points. No markdown.
Plain text only. Each section heading on its own line.
One blank line between sections.`;
}
