import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { usePreferences } from '../hooks/usePreferences';
import { apiClient } from '../services/api.service';
import { runScript } from '../utils/appscript';
import { resolveDateRange } from '../utils/dateRange';
import { getErrorMessage } from '../utils/errorMessage';
import { SearchableSelect } from '../components/SearchableSelect';
import { Icon } from '../components/Icon';
import type { BusinessManagerGroup, ImportResult, Template } from '../types';

type Destination = 'active' | 'existing' | 'new';

const DESTINATION_OPTIONS = [
  { key: 'active', label: 'Active Sheet (currently open tab)' },
  { key: 'existing', label: 'Existing Sheet (pick a tab)' },
  { key: 'new', label: 'New Sheet (create a tab)' },
];

function suggestedTabName(accountName: string, reportLevel: string) {
  if (reportLevel === 'campaign') return `${accountName} — Campaigns`;
  if (reportLevel === 'adset') return `${accountName} — Ad Sets`;
  return `${accountName} — Ads`;
}

export function HomeScreen() {
  const { token, user } = useAuth();
  const { navigate } = useRouter();
  const { preferences } = usePreferences();
  const [templateId, setTemplateId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [destination, setDestination] = useState<Destination>(preferences.defaultDestination);
  const [tabName, setTabName] = useState('');
  const [existingTabs, setExistingTabs] = useState<string[]>([]);
  const [startCell, setStartCell] = useState(preferences.defaultStartCell);
  const [phase, setPhase] = useState<'idle' | 'fetching' | 'writing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [metaExpired, setMetaExpired] = useState(false);

  // Preferences load asynchronously (Apps Script bridge call), so the
  // useState initial values above miss a late-arriving result. Apply once
  // they resolve — but only if the user hasn't already touched these
  // fields, so we don't clobber an in-progress edit.
  useEffect(() => {
    setDestination((current) => (current === 'new' ? preferences.defaultDestination : current));
    setStartCell((current) => (current === 'A1' ? preferences.defaultStartCell : current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences]);

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
  const selectedTemplate = (templatesQuery.data ?? []).find((t) => t.id === templateId);
  const selectedAccount = allAccounts.find((a) => a.id === accountId);

  // Prefill a sensible tab name once both template and account are chosen —
  // still fully editable, just saves retyping the common case.
  useEffect(() => {
    if (selectedTemplate && selectedAccount && !tabName) {
      setTabName(suggestedTabName(selectedAccount.name, selectedTemplate.reportLevel));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate?.id, selectedAccount?.id]);

  // Load existing tab names when the user picks "Existing Sheet", so they
  // can choose from a dropdown instead of retyping an exact tab name.
  useEffect(() => {
    if (destination !== 'existing') return;
    runScript<{ sheets: string[] }>('getSheetInfo')
      .then((info) => setExistingTabs(info.sheets ?? []))
      .catch(() => setExistingTabs([]));
  }, [destination]);

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) throw new Error('Select a template first.');

      setPhase('fetching');
      const { dateRange, prevDateRange } = resolveDateRange(selectedTemplate.dateRange);
      const { data } = await apiClient(token).post<ImportResult>('/meta/import', {
        templateId,
        accountId,
        dateRange,
        prevDateRange,
      });

      setPhase('writing');
      await runScript('writeToSheet', {
        destination,
        tabName,
        startCell,
        headers: data.headers,
        rows: data.rows,
        accountName: data.accountName,
        dateRange: `${data.dateRange} vs ${data.prevDateRange}`,
      });

      return data;
    },
    onSuccess: (data) => {
      setPhase('success');
      setMetaExpired(false);
      setStatusMessage(`Imported ${data.rows.length} row${data.rows.length === 1 ? '' : 's'} successfully.`);
    },
    onError: (err) => {
      setPhase('error');
      // A 401 with this specific message means Meta revoked the token
      // (backend detects error code 190) — reconnecting is the actual fix.
      // A plain expired-JWT 401 has a different message and is handled by
      // useAuth's own session logic, not here.
      const isMetaExpired =
        axios.isAxiosError(err) &&
        err.response?.status === 401 &&
        String(err.response?.data?.message ?? '').includes('Meta connection expired');
      setMetaExpired(isMetaExpired);
      setStatusMessage(getErrorMessage(err, 'Import failed.'));
    },
  });

  const needsTabName = destination !== 'active';
  const canImport =
    Boolean(templateId) &&
    Boolean(accountId) &&
    /^[A-Za-z]+\d+$/.test(startCell.trim()) &&
    (!needsTabName || tabName.trim().length > 0) &&
    !importMutation.isPending;

  const phaseLabel =
    phase === 'fetching' ? 'Fetching data from Meta…' : phase === 'writing' ? 'Writing to sheet…' : 'Import Data';

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

      <label className="field-label">Destination</label>
      <SearchableSelect
        value={destination}
        onChange={(v) => setDestination(v as Destination)}
        options={DESTINATION_OPTIONS}
      />

      {destination === 'existing' && (
        <>
          <label className="field-label">Sheet Tab</label>
          <SearchableSelect
            value={tabName}
            onChange={setTabName}
            options={existingTabs.map((name) => ({ key: name, label: name }))}
            placeholder={existingTabs.length ? 'Select a tab…' : 'Open inside Google Sheets to list tabs'}
          />
        </>
      )}

      {destination === 'new' && (
        <>
          <label className="field-label">New Tab Name</label>
          <input value={tabName} onChange={(e) => setTabName(e.target.value)} placeholder="e.g. Pushpak Ads — Campaigns" />
        </>
      )}

      <label className="field-label">Starting Cell</label>
      <input
        value={startCell}
        onChange={(e) => setStartCell(e.target.value.toUpperCase())}
        placeholder="A1"
      />

      <button className="btn btn-primary" disabled={!canImport} onClick={() => importMutation.mutate()}>
        {importMutation.isPending ? phaseLabel : 'Import Data'}
      </button>

      {statusMessage && (
        <p className={phase === 'error' ? 'error' : phase === 'success' ? 'success' : 'muted'}>
          {statusMessage}
        </p>
      )}
      {metaExpired && (
        <button className="btn btn-secondary" onClick={() => navigate('connect-meta')}>
          Reconnect Meta
        </button>
      )}

      <div className="nav-grid">
        <button className="btn btn-secondary nav-grid-item" onClick={() => navigate('templates')}>
          <Icon name="template" />
          Templates
        </button>
        <button className="btn btn-secondary nav-grid-item" onClick={() => navigate('schedules')}>
          <Icon name="schedule" />
          Schedules
        </button>
        <button className="btn btn-secondary nav-grid-item" onClick={() => navigate('ai')}>
          <Icon name="sparkles" />
          AI Insights
        </button>
        <button className="btn btn-secondary nav-grid-item" onClick={() => navigate('settings')}>
          <Icon name="settings" />
          Settings
        </button>
      </div>
    </div>
  );
}
