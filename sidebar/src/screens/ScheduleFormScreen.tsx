import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { usePreferences } from '../hooks/usePreferences';
import { apiClient } from '../services/api.service';
import { runScript } from '../utils/appscript';
import { getErrorMessage } from '../utils/errorMessage';
import { SearchableSelect } from '../components/SearchableSelect';
import { listTimezones } from '../utils/timezones';
import type { BusinessManagerGroup, Template } from '../types';

export function ScheduleFormScreen() {
  const { token } = useAuth();
  const { params, navigate } = useRouter();
  const { preferences } = usePreferences();
  const queryClient = useQueryClient();
  const isEdit = Boolean(params.id);

  const [templateId, setTemplateId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [refreshTime, setRefreshTime] = useState('09:00');
  const [timezone, setTimezone] = useState(preferences.defaultTimezone);
  const [sheetId, setSheetId] = useState('');
  const [sheetTabName, setSheetTabName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const templatesQuery = useQuery({
    queryKey: ['templates'],
    queryFn: async () => (await apiClient(token).get<Template[]>('/templates')).data,
  });
  const accountsQuery = useQuery({
    queryKey: ['meta-accounts'],
    queryFn: async () =>
      (await apiClient(token).get<BusinessManagerGroup[]>('/meta/accounts')).data,
  });
  useEffect(() => {
    (async () => {
      if (!sheetId) {
        try {
          const info = await runScript<{ id: string; name: string }>('getSheetInfo');
          setSheetId(info.id);
        } catch {
          // Not running inside Sheets, or the bridge call failed — the Sheet
          // ID field below lets the user enter it manually so Save is never
          // permanently blocked with no way to proceed.
        }
      }
    })();
  }, []);

  // Preferences load asynchronously — apply the default timezone once it
  // resolves, but only for a new schedule that hasn't been touched yet
  // (editing an existing one already loads its own saved timezone above).
  useEffect(() => {
    if (isEdit) return;
    setTimezone((current) =>
      current === preferences.defaultTimezone || !current ? preferences.defaultTimezone : current,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences]);

  const allAccounts = (accountsQuery.data ?? []).flatMap((bm) => bm.adAccounts);
  const timezoneOptions = useMemo(
    () => listTimezones().map((tz) => ({ key: tz, label: tz.replace(/_/g, ' ') })),
    [],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = { templateId, accountId, frequency, refreshTime, timezone, sheetId, sheetTabName };
      if (isEdit) {
        return apiClient(token).patch(`/schedules/${params.id}`, body);
      }
      return apiClient(token).post('/schedules', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      navigate('schedules');
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not save schedule.')),
  });

  const canSave =
    Boolean(templateId) &&
    Boolean(accountId) &&
    Boolean(timezone) &&
    /^([01]\d|2[0-3]):([0-5]\d)$/.test(refreshTime) &&
    sheetId.trim().length > 0 &&
    sheetTabName.trim().length > 0 &&
    !saveMutation.isPending;

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="btn btn-link" onClick={() => navigate('schedules')}>‹ Back</button>
        <h2>{isEdit ? 'Edit Schedule' : 'New Schedule'}</h2>
      </div>

      <label className="field-label">Template</label>
      <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
        <option value="">Select a template…</option>
        {(templatesQuery.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>

      <label className="field-label">Ad Account</label>
      <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
        <option value="">Select an account…</option>
        {allAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>

      <label className="field-label">Frequency</label>
      <select value={frequency} onChange={(e) => setFrequency(e.target.value as typeof frequency)}>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>

      <label className="field-label">Time</label>
      <input type="time" value={refreshTime} onChange={(e) => setRefreshTime(e.target.value)} />

      <label className="field-label">Timezone</label>
      <SearchableSelect value={timezone} onChange={setTimezone} options={timezoneOptions} />

      <label className="field-label">Sheet ID</label>
      <input
        value={sheetId}
        onChange={(e) => setSheetId(e.target.value)}
        placeholder="Auto-filled when opened inside Google Sheets"
      />

      <label className="field-label">Sheet Tab Name</label>
      <input
        value={sheetTabName}
        onChange={(e) => setSheetTabName(e.target.value)}
        placeholder="e.g. Pushpak Ads — Campaigns"
      />

      <button
        className="btn btn-primary"
        disabled={!canSave}
        onClick={() => saveMutation.mutate()}
      >
        {saveMutation.isPending ? 'Saving…' : 'Save Schedule'}
      </button>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
