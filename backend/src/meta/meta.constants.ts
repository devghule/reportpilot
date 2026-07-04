export const META_GRAPH_VERSION = 'v18.0';
export const META_GRAPH_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

// Maps a template metric key to the raw Meta Graph API field(s) it needs.
export const METRIC_FIELD_MAP: Record<string, string[]> = {
  spend: ['spend'],
  impressions: ['impressions'],
  reach: ['reach'],
  clicks: ['clicks'],
  ctr: ['ctr'],
  cpc: ['cpc'],
  cpm: ['cpm'],
  leads: ['actions'],
  cpl: ['cost_per_action_type'],
  roas: ['purchase_roas'],
  frequency: ['frequency'],
  thruplay: ['video_thruplay_watched_actions'],
  vtr: ['video_thruplay_watched_actions', 'impressions'],
  cpv: ['video_thruplay_watched_actions', 'spend'],
};

export const BASE_FIELDS = [
  'campaign_name',
  'adset_name',
  'ad_name',
  'account_currency',
];

export const TIME_INCREMENT_MAP: Record<string, string | number> = {
  day: 1,
  week: 7,
  month: 'monthly',
};
