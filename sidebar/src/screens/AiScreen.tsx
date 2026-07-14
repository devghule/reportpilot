import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { apiClient } from '../services/api.service';
import { runScript } from '../utils/appscript';
import { getErrorMessage } from '../utils/errorMessage';
import type { AiInsightResult, BusinessManagerGroup, SheetData } from '../types';

function tabNameForAiInsights(accountName: string) {
  return `${accountName} — AI Insights`;
}

export function AiScreen() {
  const { token } = useAuth();
  const { navigate } = useRouter();
  const [accountId, setAccountId] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accountsQuery = useQuery({
    queryKey: ['meta-accounts'],
    queryFn: async () =>
      (await apiClient(token).get<BusinessManagerGroup[]>('/meta/accounts')).data,
  });
  const allAccounts = (accountsQuery.data ?? []).flatMap((bm) => bm.adAccounts);
  const selectedAccount = allAccounts.find((a) => a.id === accountId);

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAccount) throw new Error('Select an account first.');

      const sheetData = await runScript<SheetData>('getSheetData', {
        accountName: selectedAccount.name,
      });

      if (!sheetData.campaigns || sheetData.campaigns.rows.length === 0) {
        throw new Error('Import your campaign data first.');
      }

      const { data } = await apiClient(token).post<AiInsightResult>('/ai/generate', {
        accountId,
        reportData: sheetData,
      });
      return data;
    },
    onSuccess: () => setFeedbackGiven(false),
    onError: (err) => setError(getErrorMessage(err, 'Could not generate insights.')),
  });

  const feedbackMutation = useMutation({
    mutationFn: (feedback: 'thumbs_up' | 'thumbs_down') =>
      apiClient(token).post('/ai/feedback', { aiReportId: generateMutation.data?.id, feedback }),
    onSuccess: () => setFeedbackGiven(true),
  });

  const writeToSheetMutation = useMutation({
    mutationFn: async () => {
      const result = generateMutation.data;
      if (!result || !selectedAccount) return;
      const content = [
        'PERFORMANCE SUMMARY',
        result.performanceSummary,
        '',
        'CREATIVE FATIGUE ALERT',
        result.creativeFatigue,
        '',
        'BUDGET WASTE ALERT',
        result.budgetWaste,
        '',
        'SCALING OPPORTUNITY',
        result.scalingOpp,
      ];
      await runScript('writeAiInsights', {
        tabName: tabNameForAiInsights(selectedAccount.name),
        accountName: selectedAccount.name,
        dateRange: 'recent period',
        timestamp: new Date().toLocaleString(),
        content,
      });
    },
  });

  const copyToClipboard = () => {
    const result = generateMutation.data;
    if (!result) return;
    const text = [
      'PERFORMANCE SUMMARY', result.performanceSummary, '',
      'CREATIVE FATIGUE ALERT', result.creativeFatigue, '',
      'BUDGET WASTE ALERT', result.budgetWaste, '',
      'SCALING OPPORTUNITY', result.scalingOpp,
    ].join('\n');
    navigator.clipboard?.writeText(text).catch(() => undefined);
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="btn btn-link" onClick={() => navigate('home')}>‹ Back</button>
        <h2>AI Insights</h2>
      </div>

      <label className="field-label">Ad Account</label>
      <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
        <option value="">Select an account…</option>
        {allAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>

      <button
        className="btn btn-primary"
        disabled={!accountId || generateMutation.isPending}
        onClick={() => { setError(null); generateMutation.mutate(); }}
      >
        {generateMutation.isPending ? 'Analysing…' : 'Generate AI Insights'}
      </button>

      {error && <p className="error">{error}</p>}

      {generateMutation.data && (
        <div className="ai-result">
          <h3>Performance Summary</h3>
          <p className="small">{generateMutation.data.performanceSummary}</p>

          <h3>Creative Fatigue Alert</h3>
          <p className="small">{generateMutation.data.creativeFatigue}</p>

          <h3>Budget Waste Alert</h3>
          <p className="small">{generateMutation.data.budgetWaste}</p>

          <h3>Scaling Opportunity</h3>
          <p className="small">{generateMutation.data.scalingOpp}</p>

          <div className="list-item-actions">
            <button className="btn btn-link" onClick={() => feedbackMutation.mutate('thumbs_up')} disabled={feedbackGiven}>👍</button>
            <button className="btn btn-link" onClick={() => feedbackMutation.mutate('thumbs_down')} disabled={feedbackGiven}>👎</button>
            <button className="btn btn-link" onClick={copyToClipboard}>Copy</button>
          </div>

          <button
            className="btn btn-secondary"
            disabled={writeToSheetMutation.isPending}
            onClick={() => writeToSheetMutation.mutate()}
          >
            {writeToSheetMutation.isPending ? 'Writing…' : 'Write to AI Insights tab'}
          </button>
          {writeToSheetMutation.isSuccess && <p className="muted small">Written to sheet.</p>}
        </div>
      )}
    </div>
  );
}
