import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { apiClient } from '../services/api.service';
import type { BusinessManagerGroup } from '../types';

export function SettingsScreen() {
  const { token, user, setToken } = useAuth();
  const { navigate } = useRouter();
  const queryClient = useQueryClient();

  const accountsQuery = useQuery({
    queryKey: ['meta-accounts'],
    queryFn: async () =>
      (await apiClient(token).get<BusinessManagerGroup[]>('/meta/accounts')).data,
  });

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
      <ul className="list">
        {(accountsQuery.data ?? []).flatMap((bm) => bm.adAccounts).map((account) => (
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
      <button className="btn btn-secondary" onClick={() => navigate('connect-meta')}>
        + Connect another account
      </button>

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
