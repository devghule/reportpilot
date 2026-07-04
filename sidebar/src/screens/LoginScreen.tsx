import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { openOAuthPopup } from '../utils/popup';

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
      navigate('connect-meta');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
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
