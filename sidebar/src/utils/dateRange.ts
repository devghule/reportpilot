import { DATE_RANGE_PRESETS, decodeCustomDateRange } from '../constants/dateRangePresets';

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function subDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

export interface ResolvedDateRange {
  dateRange: { since: string; until: string };
  prevDateRange: { since: string; until: string };
}

// Resolves a Template's dateRange (a preset key, or "custom:since:until" per
// the Template Builder's encoding) into concrete since/until pairs for both
// the current and comparison period. Previously the import call ignored
// template.dateRange entirely and always hardcoded the last 7 days.
export function resolveDateRange(templateDateRange: string): ResolvedDateRange {
  const today = new Date();

  const custom = decodeCustomDateRange(templateDateRange);
  if (custom?.since && custom.until) {
    const { since, until } = custom;
    const sinceDate = new Date(since);
    const untilDate = new Date(until);
    const days = Math.max(
      1,
      Math.round((untilDate.getTime() - sinceDate.getTime()) / 86_400_000) + 1,
    );
    return {
      dateRange: { since, until },
      prevDateRange: {
        since: toDateString(subDays(sinceDate, days)),
        until: toDateString(subDays(sinceDate, 1)),
      },
    };
  }

  if (templateDateRange === DATE_RANGE_PRESETS.LAST_30) {
    return {
      dateRange: { since: toDateString(subDays(today, 30)), until: toDateString(today) },
      prevDateRange: { since: toDateString(subDays(today, 60)), until: toDateString(subDays(today, 30)) },
    };
  }

  if (templateDateRange === DATE_RANGE_PRESETS.THIS_MONTH) {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const daysSoFar = Math.round((today.getTime() - start.getTime()) / 86_400_000) + 1;
    const prevEnd = subDays(start, 1);
    const prevStart = subDays(prevEnd, daysSoFar - 1);
    return {
      dateRange: { since: toDateString(start), until: toDateString(today) },
      prevDateRange: { since: toDateString(prevStart), until: toDateString(prevEnd) },
    };
  }

  // Default / 'last_7'
  return {
    dateRange: { since: toDateString(subDays(today, 7)), until: toDateString(today) },
    prevDateRange: { since: toDateString(subDays(today, 14)), until: toDateString(subDays(today, 7)) },
  };
}
