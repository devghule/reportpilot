import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { apiClient } from '../services/api.service';
import type { Template } from '../types';

const AVAILABLE_METRICS = [
  'spend', 'impressions', 'reach', 'clicks', 'ctr', 'cpc', 'cpm',
  'leads', 'cpl', 'roas', 'frequency', 'thruplay', 'vtr', 'cpv',
];

function toList(value: string) {
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

export function TemplateFormScreen() {
  const { token } = useAuth();
  const { params, navigate } = useRouter();
  const queryClient = useQueryClient();
  const isEdit = Boolean(params.id);

  const [name, setName] = useState('');
  const [reportLevel, setReportLevel] = useState('campaign');
  const [dateGranularity, setDateGranularity] = useState('day');
  const [dateRange, setDateRange] = useState('last_7');
  const [metrics, setMetrics] = useState<string[]>(['spend', 'impressions']);
  const [dimensionsInput, setDimensionsInput] = useState('campaign_name');
  const [columnOrderInput, setColumnOrderInput] = useState('campaign_name,spend,impressions');
  const [sortBy, setSortBy] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [error, setError] = useState<string | null>(null);

  const existingQuery = useQuery({
    queryKey: ['template', params.id],
    queryFn: async () => (await apiClient(token).get<Template>(`/templates/${params.id}`)).data,
    enabled: isEdit,
  });

  useEffect(() => {
    const t = existingQuery.data;
    if (!t) return;
    setName(t.name);
    setReportLevel(t.reportLevel);
    setDateGranularity(t.dateGranularity);
    setDateRange(t.dateRange);
    setMetrics(t.metrics);
    setDimensionsInput(t.dimensions.join(','));
    setColumnOrderInput(t.columnOrder.join(','));
    setSortBy(t.sortBy ?? '');
    setSortDirection((t.sortDirection as 'asc' | 'desc') ?? 'desc');
  }, [existingQuery.data]);

  const toggleMetric = (metric: string) => {
    setMetrics((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric],
    );
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name,
        reportLevel,
        dateGranularity,
        dateRange,
        metrics,
        dimensions: toList(dimensionsInput),
        columnOrder: toList(columnOrderInput),
        sortBy: sortBy || undefined,
        sortDirection: sortBy ? sortDirection : undefined,
      };
      if (isEdit) {
        return apiClient(token).patch(`/templates/${params.id}`, body);
      }
      return apiClient(token).post('/templates', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      navigate('templates');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not save template.'),
  });

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="btn btn-link" onClick={() => navigate('templates')}>‹ Back</button>
        <h2>{isEdit ? 'Edit Template' : 'New Template'}</h2>
      </div>

      <label className="field-label">Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} />

      <label className="field-label">Report Level</label>
      <select value={reportLevel} onChange={(e) => setReportLevel(e.target.value)}>
        <option value="campaign">Campaign</option>
        <option value="adset">Ad Set</option>
        <option value="ad">Ad</option>
      </select>

      <label className="field-label">Granularity</label>
      <select value={dateGranularity} onChange={(e) => setDateGranularity(e.target.value)}>
        <option value="day">Day</option>
        <option value="week">Week</option>
        <option value="month">Month</option>
      </select>

      <label className="field-label">Date Range</label>
      <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
        <option value="last_7">Last 7 days</option>
        <option value="last_30">Last 30 days</option>
        <option value="this_month">This month</option>
        <option value="custom">Custom</option>
      </select>

      <label className="field-label">Metrics</label>
      <div className="checkbox-grid">
        {AVAILABLE_METRICS.map((metric) => (
          <label key={metric} className="checkbox-item">
            <input
              type="checkbox"
              checked={metrics.includes(metric)}
              onChange={() => toggleMetric(metric)}
            />
            {metric}
          </label>
        ))}
      </div>

      <label className="field-label">Dimensions (comma-separated)</label>
      <input value={dimensionsInput} onChange={(e) => setDimensionsInput(e.target.value)} />

      <label className="field-label">Column order (comma-separated)</label>
      <input value={columnOrderInput} onChange={(e) => setColumnOrderInput(e.target.value)} />

      <label className="field-label">Sort by (optional)</label>
      <input value={sortBy} onChange={(e) => setSortBy(e.target.value)} placeholder="e.g. spend" />

      <select value={sortDirection} onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}>
        <option value="asc">Ascending</option>
        <option value="desc">Descending</option>
      </select>

      <button
        className="btn btn-primary"
        disabled={!name || saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
      >
        {saveMutation.isPending ? 'Saving…' : 'Save Template'}
      </button>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
