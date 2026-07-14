import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { openOAuthPopup } from '../utils/popup';
import { apiClient } from '../services/api.service';
import { getErrorMessage } from '../utils/errorMessage';
import type { BusinessManagerGroup } from '../types';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? '';

export function LoginScreen() {
  const { setToken } = useAuth();
  const { navigate } = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await openOAuthPopup<{ token: string }>(
        `${BACKEND_URL}/auth/google`,
        'google-auth-success',
      );
      await setToken(result.token);

      // Meta connections persist independently in the database — a returning
      // user who already connected Meta shouldn't be sent through "Connect
      // Meta" again just because their Google session expired and they had
      // to log in again. Only show it when there's genuinely nothing connected.
      const accounts = await apiClient(result.token)
        .get<BusinessManagerGroup[]>('/meta/accounts')
        .then((res) => res.data)
        .catch(() => []);
      const alreadyConnected = accounts.some((bm) => bm.adAccounts.length > 0);
      navigate(alreadyConnected ? 'home' : 'connect-meta');
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen screen-center">
      <h1 className="app-title">ReportPilot</h1>
      <p className="muted">Meta Ads reporting, right inside Google Sheets.</p>
      <button className="btn btn-primary" onClick={handleLogin} disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in with Google'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
