import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { apiClient } from '../services/api.service';
import { runScript } from '../utils/appscript';
import type { BusinessManagerGroup, ImportResult, Template } from '../types';

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function subDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function tabNameFor(accountName: string, reportLevel: string) {
  if (reportLevel === 'campaign') return `${accountName} — Campaigns`;
  if (reportLevel === 'adset') return `${accountName} — Ad Sets`;
  return `${accountName} — Ads`;
}

export function HomeScreen() {
  const { token, user } = useAuth();
  const { navigate } = useRouter();
  const [templateId, setTemplateId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const templatesQuery = useQuery({
    queryKey: ['templates'],
    queryFn: async () => (await apiClient(token).get<Template[]>('/templates')).data,
  });

  const accountsQuery = useQuery({
    queryKey: ['meta-accounts'],
    queryFn: async () =>
      (await apiClient(token).get<BusinessManagerGroup[]>('/meta/accounts')).data,
  });

  const allAccounts = (accountsQuery.data ?? []).flatMap((bm) => bm.adAccounts);

  const importMutation = useMutation({
    mutationFn: async () => {
      const today = new Date();
      const dateRange = { since: toDateString(subDays(today, 7)), until: toDateString(today) };
      const prevDateRange = { since: toDateString(subDays(today, 14)), until: toDateString(subDays(today, 7)) };
      const { data } = await apiClient(token).post<ImportResult>('/meta/import', {
        templateId,
        accountId,
        dateRange,
        prevDateRange,
      });
      return data;
    },
    onSuccess: async (data) => {
      setStatus('Writing to sheet…');
      await runScript('writeToSheet', {
        tabName: tabNameFor(data.accountName, data.reportLevel),
        headers: data.headers,
        rows: data.rows,
        accountName: data.accountName,
        dateRange: `${data.dateRange} vs ${data.prevDateRange}`,
      });
      setStatus('Import complete.');
    },
    onError: (err) => {
      setStatus(err instanceof Error ? err.message : 'Import failed.');
    },
  });

  return (
    <div className="screen">
      <h2>Hi{user?.name ? `, ${user.name}` : ''}</h2>

      <label className="field-label">Template</label>
      <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
        <option value="">Select a template…</option>
        {(templatesQuery.data ?? []).map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>

      <label className="field-label">Ad Account</label>
      <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
        <option value="">Select an account…</option>
        {allAccounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>

      <button
        className="btn btn-primary"
        disabled={!templateId || !accountId || importMutation.isPending}
        onClick={() => importMutation.mutate()}
      >
        {importMutation.isPending ? 'Importing…' : 'Import last 7 days'}
      </button>

      {status && <p className="muted">{status}</p>}

      <div className="nav-grid">
        <button className="btn btn-secondary" onClick={() => navigate('templates')}>Templates</button>
        <button className="btn btn-secondary" onClick={() => navigate('schedules')}>Schedules</button>
        <button className="btn btn-secondary" onClick={() => navigate('ai')}>AI Insights</button>
        <button className="btn btn-secondary" onClick={() => navigate('settings')}>Settings</button>
      </div>
    </div>
  );
}
