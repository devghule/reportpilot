import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { apiClient } from '../services/api.service';
import { runScript } from '../utils/appscript';
import type { BusinessManagerGroup, Template } from '../types';

export function ScheduleFormScreen() {
  const { token } = useAuth();
  const { params, navigate } = useRouter();
  const queryClient = useQueryClient();
  const isEdit = Boolean(params.id);

  const [templateId, setTemplateId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [refreshTime, setRefreshTime] = useState('09:00');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
  );
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
          // Not running inside Sheets — leave blank for manual entry.
        }
      }
    })();
  }, []);

  const allAccounts = (accountsQuery.data ?? []).flatMap((bm) => bm.adAccounts);

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
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not save schedule.'),
  });

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

      <label className="field-label">Time (24h)</label>
      <input type="time" value={refreshTime} onChange={(e) => setRefreshTime(e.target.value)} />

      <label className="field-label">Timezone</label>
      <input value={timezone} onChange={(e) => setTimezone(e.target.value)} />

      <label className="field-label">Sheet Tab Name</label>
      <input
        value={sheetTabName}
        onChange={(e) => setSheetTabName(e.target.value)}
        placeholder="e.g. Pushpak Ads — Campaigns"
      />

      <button
        className="btn btn-primary"
        disabled={!templateId || !accountId || !sheetId || !sheetTabName || saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
      >
        {saveMutation.isPending ? 'Saving…' : 'Save Schedule'}
      </button>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
