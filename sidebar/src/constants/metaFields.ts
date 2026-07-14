// Mirrors backend/src/meta/meta.constants.ts's METRIC_FIELD_MAP keys — this
// file only affects labels/grouping/search in the Template Builder UI, it
// does not change what the backend actually requests from Meta.

import { DATE_RANGE_PRESETS } from './dateRangePresets';

export interface FieldOption {
  key: string;
  label: string;
  group: string;
}

export const METRIC_OPTIONS: FieldOption[] = [
  { key: 'spend', label: 'Spend', group: 'Cost' },
  { key: 'cpc', label: 'CPC', group: 'Cost' },
  { key: 'cpm', label: 'CPM', group: 'Cost' },
  { key: 'cpl', label: 'CPL', group: 'Cost' },
  { key: 'cpv', label: 'CPV', group: 'Cost' },
  { key: 'impressions', label: 'Impressions', group: 'Reach & Frequency' },
  { key: 'reach', label: 'Reach', group: 'Reach & Frequency' },
  { key: 'frequency', label: 'Frequency', group: 'Reach & Frequency' },
  { key: 'clicks', label: 'Clicks', group: 'Engagement' },
  { key: 'ctr', label: 'CTR', group: 'Engagement' },
  { key: 'leads', label: 'Leads', group: 'Conversions' },
  { key: 'roas', label: 'ROAS', group: 'Conversions' },
  { key: 'thruplay', label: 'ThruPlays', group: 'Video' },
  { key: 'vtr', label: 'VTR', group: 'Video' },
];

export const DIMENSION_OPTIONS: FieldOption[] = [
  { key: 'campaign_name', label: 'Campaign Name', group: 'Identity' },
  { key: 'adset_name', label: 'Ad Set Name', group: 'Identity' },
  { key: 'ad_name', label: 'Ad Name', group: 'Identity' },
  { key: 'ad_creative_image', label: 'Ad Creative Image', group: 'Creative' },
  { key: 'ad_creative_title', label: 'Ad Creative Title', group: 'Creative' },
  { key: 'ad_creative_body', label: 'Ad Copy', group: 'Creative' },
  { key: 'account_currency', label: 'Currency', group: 'Identity' },
  { key: 'date', label: 'Date', group: 'Identity' },
];

export const ALL_FIELD_OPTIONS: FieldOption[] = [
  ...METRIC_OPTIONS,
  ...DIMENSION_OPTIONS,
  { key: 'period_change', label: 'vs Previous Period', group: 'Comparison' },
];

export const REPORT_LEVEL_OPTIONS = [
  { key: 'campaign', label: 'Campaign', group: 'Level' },
  { key: 'adset', label: 'Ad Set', group: 'Level' },
  { key: 'ad', label: 'Ad', group: 'Level' },
];

export const DATE_RANGE_OPTIONS = [
  { key: DATE_RANGE_PRESETS.LAST_7, label: 'Last 7 days', group: 'Preset' },
  { key: DATE_RANGE_PRESETS.LAST_30, label: 'Last 30 days', group: 'Preset' },
  { key: DATE_RANGE_PRESETS.THIS_MONTH, label: 'This month', group: 'Preset' },
  { key: DATE_RANGE_PRESETS.CUSTOM, label: 'Custom range', group: 'Preset' },
];

export const FILTER_OPERATORS = [
  { key: 'equal', label: 'is' },
  { key: 'not_equal', label: 'is not' },
  { key: 'greater_than', label: 'greater than' },
  { key: 'less_than', label: 'less than' },
  { key: 'in', label: 'is any of' },
  { key: 'not_in', label: 'is none of' },
];
