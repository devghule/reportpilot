import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { apiClient } from '../services/api.service';
import { openOAuthPopup } from '../utils/popup';
import { getErrorMessage } from '../utils/errorMessage';
import type { BusinessManagerGroup } from '../types';

export function ConnectMetaScreen() {
  const { token } = useAuth();
  const { navigate } = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient(token).get<{ url: string }>('/meta/auth-url');
      await openOAuthPopup<{ success: boolean; accounts: BusinessManagerGroup[] }>(
        data.url,
        'meta-auth-success',
      );
      navigate('home');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not connect Meta account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen screen-center">
      <h2>Connect your Meta Ads account</h2>
      <p className="muted">
        ReportPilot needs access to your ad accounts to pull campaign data.
      </p>
      <button className="btn btn-primary" onClick={handleConnect} disabled={loading}>
        {loading ? 'Connecting…' : 'Connect Meta'}
      </button>
      <button className="btn btn-link" onClick={() => navigate('home')}>
        Skip for now
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
