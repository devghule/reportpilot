import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { usePreferences } from '../hooks/usePreferences';
import { apiClient } from '../services/api.service';
import { SearchableSelect } from '../components/SearchableSelect';
import { EmptyState } from '../components/EmptyState';
import { listTimezones } from '../utils/timezones';
import type { BusinessManagerGroup } from '../types';

const DESTINATION_OPTIONS = [
  { key: 'active', label: 'Active Sheet' },
  { key: 'existing', label: 'Existing Sheet' },
  { key: 'new', label: 'New Sheet' },
];

const THEME_OPTIONS = [
  { key: 'system', label: 'Match system' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

export function SettingsScreen() {
  const { token, user, setToken } = useAuth();
  const { navigate } = useRouter();
  const { preferences, setPreferences } = usePreferences();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState(preferences);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  // listTimezones() returns the full IANA database (~400 entries) — computing
  // this fresh on every keystroke elsewhere in the form was wasted work.
  const timezoneOptions = useMemo(
    () => listTimezones().map((tz) => ({ key: tz, label: tz.replace(/_/g, ' ') })),
    [],
  );

  const accountsQuery = useQuery({
    queryKey: ['meta-accounts'],
    queryFn: async () =>
      (await apiClient(token).get<BusinessManagerGroup[]>('/meta/accounts')).data,
  });
  const connectedAccounts = (accountsQuery.data ?? []).flatMap((bm) => bm.adAccounts);

  const disconnectMutation = useMutation({
    mutationFn: (accountId: string) =>
      apiClient(token).post('/meta/disconnect', { accountId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meta-accounts'] }),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => apiClient(token).delete('/users/me'),
    onSuccess: async () => {
      await setToken(null);
      navigate('login');
    },
  });

  const savePreferences = async () => {
    await setPreferences(draft);
    setSavedMessage('Preferences saved.');
    setTimeout(() => setSavedMessage(null), 2000);
  };

  const handleLogout = async () => {
    await apiClient(token).post('/auth/logout').catch(() => undefined);
    await setToken(null);
    navigate('login');
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="btn btn-link" onClick={() => navigate('home')}>‹ Back</button>
        <h2>Settings</h2>
      </div>

      <p><strong>{user?.name ?? user?.email}</strong></p>
      <p className="muted small">Plan: {user?.plan}</p>

      <h3>Connected Meta Accounts</h3>
      {connectedAccounts.length === 0 ? (
        <EmptyState icon="plug" title="No Meta accounts connected" />
      ) : (
        <ul className="list">
          {connectedAccounts.map((account) => (
            <li key={account.id} className="list-item">
              <span>{account.name} ({account.currency})</span>
              <button
                className="btn btn-link danger"
                onClick={() => {
                  if (confirm(`This will remove ${account.name} from ReportPilot. Your sheet data will not be deleted.`)) {
                    disconnectMutation.mutate(account.id);
                  }
                }}
              >
                Disconnect
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="btn btn-secondary" onClick={() => navigate('connect-meta')}>
        + Connect another account
      </button>

      <h3>Preferences</h3>

      <label className="field-label">Default Import Destination</label>
      <SearchableSelect
        value={draft.defaultDestination}
        onChange={(v) => setDraft({ ...draft, defaultDestination: v as typeof draft.defaultDestination })}
        options={DESTINATION_OPTIONS}
      />

      <label className="field-label">Default Starting Cell</label>
      <input
        value={draft.defaultStartCell}
        onChange={(e) => setDraft({ ...draft, defaultStartCell: e.target.value.toUpperCase() })}
        placeholder="A1"
      />

      <label className="field-label">Default Schedule Timezone</label>
      <SearchableSelect
        value={draft.defaultTimezone}
        onChange={(v) => setDraft({ ...draft, defaultTimezone: v })}
        options={timezoneOptions}
      />

      <label className="field-label">Theme</label>
      <SearchableSelect
        value={draft.theme}
        onChange={(v) => setDraft({ ...draft, theme: v as typeof draft.theme })}
        options={THEME_OPTIONS}
      />

      <button className="btn btn-primary" onClick={savePreferences}>
        Save Preferences
      </button>
      {savedMessage && <p className="success">{savedMessage}</p>}

      <div className="settings-danger">
        <button className="btn btn-secondary" onClick={handleLogout}>Log out</button>
        <button
          className="btn btn-link danger"
          onClick={() => {
            if (confirm('This will permanently delete your account and all data. This cannot be undone.')) {
              deleteAccountMutation.mutate();
            }
          }}
        >
          Delete my account
        </button>
      </div>
    </div>
  );
}
