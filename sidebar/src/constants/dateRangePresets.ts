// Single source of truth for the date-range preset keys stored on
// Template.dateRange, and the "custom:since:until" encoding scheme used for
// custom ranges. Previously the 'custom:' prefix and preset key strings
// ('last_7' / 'last_30' / 'this_month') were duplicated independently in
// TemplateFormScreen (encode/decode) and utils/dateRange.ts (resolve).

export const DATE_RANGE_PRESETS = {
  LAST_7: 'last_7',
  LAST_30: 'last_30',
  THIS_MONTH: 'this_month',
  CUSTOM: 'custom',
} as const;

const CUSTOM_RANGE_PREFIX = `${DATE_RANGE_PRESETS.CUSTOM}:`;

export function encodeCustomDateRange(since: string, until: string): string {
  return `${CUSTOM_RANGE_PREFIX}${since}:${until}`;
}

export function decodeCustomDateRange(
  dateRange: string,
): { since: string; until: string } | null {
  if (!dateRange.startsWith(CUSTOM_RANGE_PREFIX)) return null;
  const [, since, until] = dateRange.split(':');
  return { since: since ?? '', until: until ?? '' };
}
