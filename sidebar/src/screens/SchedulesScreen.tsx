import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { apiClient } from '../services/api.service';
import { EmptyState } from '../components/EmptyState';
import { SkeletonList } from '../components/Skeleton';
import type { Schedule } from '../types';

export function SchedulesScreen() {
  const { token } = useAuth();
  const { navigate } = useRouter();
  const queryClient = useQueryClient();

  const schedulesQuery = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => (await apiClient(token).get<Schedule[]>('/schedules')).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['schedules'] });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => apiClient(token).patch(`/schedules/${id}/pause`),
    onSuccess: invalidate,
  });
  const resumeMutation = useMutation({
    mutationFn: (id: string) => apiClient(token).patch(`/schedules/${id}/resume`),
    onSuccess: invalidate,
  });
  const runNowMutation = useMutation({
    mutationFn: (id: string) => apiClient(token).post(`/schedules/${id}/run-now`),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(token).delete(`/schedules/${id}`),
    onSuccess: invalidate,
  });

  // `status` is only ever active | paused | disabled per the schema — a
  // genuine run failure lives in `lastRunStatus`, not `status`. The old
  // version treated anything not active/paused as "Failed", but a failed
  // *schedule* still has status='active' after retries, so it always
  // rendered as a plain green "Active" badge with no failure signal at all.
  const displayStatus = (s: Schedule): { label: string; className: string } => {
    if (s.status === 'paused') return { label: 'Paused', className: 'badge-paused' };
    if (s.lastRunStatus === 'failed') return { label: 'Failed', className: 'badge-disabled' };
    return { label: 'Active', className: 'badge-active' };
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="btn btn-link" onClick={() => navigate('home')}>‹ Back</button>
        <h2>Schedules</h2>
      </div>

      <button className="btn btn-primary" onClick={() => navigate('schedule-form')}>
        + New Schedule
      </button>

      {schedulesQuery.isLoading ? (
        <SkeletonList rows={3} />
      ) : (schedulesQuery.data ?? []).length === 0 ? (
        <EmptyState
          icon="schedule"
          title="No schedules yet"
          description="Set up a schedule to have reports refresh automatically."
        />
      ) : (
        <ul className="list">
          {(schedulesQuery.data ?? []).map((s) => {
            const status = displayStatus(s);
            return (
            <li key={s.id} className="list-item schedule-card">
              <div>
                <strong>{s.template?.name ?? 'Template'}</strong>
                <span className={`badge ${status.className}`}>{status.label}</span>
              </div>
              <p className="muted small">
                {s.account?.metaAccountName ?? 'Account'} · {s.frequency} at {s.refreshTime}
              </p>
              <p className="muted small">
                Last run: {s.lastRunDisplay ?? 'Never'}
                {s.lastRunStatus === 'failed' && s.lastError ? ` — ${s.lastError}` : ''}
              </p>
              <p className="muted small">Next run: {s.nextRunDisplay ?? '—'}</p>
              <div className="list-item-actions">
                {s.status === 'active' ? (
                  <button className="btn btn-link" onClick={() => pauseMutation.mutate(s.id)}>Pause</button>
                ) : (
                  <button className="btn btn-link" onClick={() => resumeMutation.mutate(s.id)}>Resume</button>
                )}
                <button className="btn btn-link" onClick={() => runNowMutation.mutate(s.id)}>Run Now</button>
                <button className="btn btn-link" onClick={() => navigate('schedule-form', { id: s.id })}>Edit</button>
                <button className="btn btn-link danger" onClick={() => deleteMutation.mutate(s.id)}>Delete</button>
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
