import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { apiClient } from '../services/api.service';
import { getErrorMessage } from '../utils/errorMessage';
import type { Template } from '../types';
import { SearchableSelect } from '../components/SearchableSelect';
import { ChipMultiSelect } from '../components/ChipMultiSelect';
import { DragOrderList } from '../components/DragOrderList';
import { FilterBuilder, type FilterRow } from '../components/FilterBuilder';
import {
  ALL_FIELD_OPTIONS,
  DATE_RANGE_OPTIONS,
  DIMENSION_OPTIONS,
  METRIC_OPTIONS,
  REPORT_LEVEL_OPTIONS,
} from '../constants/metaFields';
import {
  DATE_RANGE_PRESETS,
  decodeCustomDateRange,
  encodeCustomDateRange,
} from '../constants/dateRangePresets';

// Granularity used to be a user-facing dropdown, but it's really an
// implementation detail of how Meta buckets rows (time_increment), not a
// decision worth surfacing in the builder. Every template now gets daily
// rows within whichever date range is picked — the backend still requires
// this field, so we send a fixed value rather than changing that contract.
const FIXED_DATE_GRANULARITY = 'day';

function labelForField(key: string) {
  return ALL_FIELD_OPTIONS.find((o) => o.key === key)?.label ?? key;
}

export function TemplateFormScreen() {
  const { token } = useAuth();
  const { params, navigate } = useRouter();
  const queryClient = useQueryClient();
  const isEdit = Boolean(params.id);

  const [name, setName] = useState('');
  const [reportLevel, setReportLevel] = useState('campaign');
  const [dateRange, setDateRange] = useState<string>(DATE_RANGE_PRESETS.LAST_7);
  const [customSince, setCustomSince] = useState('');
  const [customUntil, setCustomUntil] = useState('');
  const [metrics, setMetrics] = useState<string[]>(['spend', 'impressions']);
  const [dimensions, setDimensions] = useState<string[]>(['campaign_name']);
  const [columnOrder, setColumnOrder] = useState<string[]>(['campaign_name', 'spend', 'impressions']);
  const [sortBy, setSortBy] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<FilterRow[]>([]);
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
    const custom = decodeCustomDateRange(t.dateRange);
    if (custom) {
      setDateRange(DATE_RANGE_PRESETS.CUSTOM);
      setCustomSince(custom.since);
      setCustomUntil(custom.until);
    } else {
      setDateRange(t.dateRange);
    }
    setMetrics(t.metrics);
    setDimensions(t.dimensions);
    setColumnOrder(t.columnOrder);
    setSortBy(t.sortBy ?? '');
    setSortDirection((t.sortDirection as 'asc' | 'desc') ?? 'desc');
    setFilters(Array.isArray(t.filters) ? (t.filters as FilterRow[]) : []);
  }, [existingQuery.data]);

  // Keep columnOrder in sync with whatever fields are actually selected —
  // append newly-added fields at the end, drop removed ones, but otherwise
  // preserve the user's drag-and-drop order for everything else.
  useEffect(() => {
    const selected = [...dimensions, ...metrics];
    setColumnOrder((prev) => {
      const kept = prev.filter((key) => selected.includes(key));
      const added = selected.filter((key) => !kept.includes(key));
      return [...kept, ...added];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics, dimensions]);

  const sortableOptions = columnOrder.map((key) => ({ key, label: labelForField(key) }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const resolvedDateRange =
        dateRange === DATE_RANGE_PRESETS.CUSTOM
          ? encodeCustomDateRange(customSince, customUntil)
          : dateRange;
      const body = {
        name,
        reportLevel,
        dateGranularity: FIXED_DATE_GRANULARITY,
        dateRange: resolvedDateRange,
        metrics,
        dimensions,
        columnOrder,
        sortBy: sortBy || undefined,
        sortDirection: sortBy ? sortDirection : undefined,
        filters: filters.filter((f) => f.field && f.value),
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
    onError: (err) => setError(getErrorMessage(err, 'Could not save template.')),
  });

  const canSave =
    name.trim().length > 0 &&
    (metrics.length > 0 || dimensions.length > 0) &&
    (dateRange !== DATE_RANGE_PRESETS.CUSTOM || (customSince && customUntil));

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="btn btn-link" onClick={() => navigate('templates')}>‹ Back</button>
        <h2>{isEdit ? 'Edit Template' : 'New Template'}</h2>
      </div>

      <label className="field-label">Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekly Client Report" />

      <label className="field-label">Report Level</label>
      <SearchableSelect value={reportLevel} onChange={setReportLevel} options={REPORT_LEVEL_OPTIONS} />

      <label className="field-label">Date Range</label>
      <SearchableSelect value={dateRange} onChange={setDateRange} options={DATE_RANGE_OPTIONS} />

      {dateRange === DATE_RANGE_PRESETS.CUSTOM && (
        <div className="date-range-row">
          <input type="date" value={customSince} onChange={(e) => setCustomSince(e.target.value)} />
          <span className="muted small">to</span>
          <input type="date" value={customUntil} onChange={(e) => setCustomUntil(e.target.value)} />
        </div>
      )}

      <label className="field-label">Metrics</label>
      <ChipMultiSelect
        values={metrics}
        onChange={setMetrics}
        options={METRIC_OPTIONS}
        placeholder="Add a metric…"
      />

      <label className="field-label">Dimensions</label>
      <ChipMultiSelect
        values={dimensions}
        onChange={setDimensions}
        options={DIMENSION_OPTIONS}
        placeholder="Add a dimension…"
      />

      <label className="field-label">Column Order (drag to reorder)</label>
      <DragOrderList items={columnOrder} onChange={setColumnOrder} labelFor={labelForField} />

      <label className="field-label">Sort By</label>
      <SearchableSelect
        value={sortBy}
        onChange={setSortBy}
        options={[{ key: '', label: 'No sorting' }, ...sortableOptions]}
      />

      {sortBy && (
        <SearchableSelect
          value={sortDirection}
          onChange={(v) => setSortDirection(v as 'asc' | 'desc')}
          options={[
            { key: 'desc', label: 'Descending' },
            { key: 'asc', label: 'Ascending' },
          ]}
        />
      )}

      <label className="field-label">Filters</label>
      <FilterBuilder filters={filters} onChange={setFilters} />

      <button
        className="btn btn-primary"
        disabled={!canSave || saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
      >
        {saveMutation.isPending ? 'Saving…' : 'Save Template'}
      </button>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
