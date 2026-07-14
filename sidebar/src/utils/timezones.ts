// A reasonably complete fallback list for environments where
// Intl.supportedValuesOf isn't available — covers the common cases without
// needing to bundle the full IANA database ourselves.
const FALLBACK_TIMEZONES = [
  'UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Karachi', 'Asia/Dhaka',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'Australia/Sydney', 'Australia/Perth', 'Pacific/Auckland',
  'Africa/Cairo', 'Africa/Johannesburg',
];

export function listTimezones(): string[] {
  const intlWithSupport = Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  };
  try {
    if (typeof intlWithSupport.supportedValuesOf === 'function') {
      return intlWithSupport.supportedValuesOf('timeZone');
    }
  } catch {
    // fall through to the static list below
  }
  return FALLBACK_TIMEZONES;
}
