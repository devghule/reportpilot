import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { apiClient } from '../services/api.service';
import { EmptyState } from '../components/EmptyState';
import { SkeletonList } from '../components/Skeleton';
import type { Template } from '../types';

export function TemplatesScreen() {
  const { token } = useAuth();
  const { navigate } = useRouter();
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ['templates'],
    queryFn: async () => (await apiClient(token).get<Template[]>('/templates')).data,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient(token).delete(`/templates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="btn btn-link" onClick={() => navigate('home')}>‹ Back</button>
        <h2>Templates</h2>
      </div>

      <button className="btn btn-primary" onClick={() => navigate('template-form')}>
        + New Template
      </button>

      {templatesQuery.isLoading ? (
        <SkeletonList rows={4} />
      ) : (templatesQuery.data ?? []).length === 0 ? (
        <EmptyState
          icon="template"
          title="No templates yet"
          description="Create a template to define which metrics and columns your reports pull."
        />
      ) : (
        <ul className="list">
          {(templatesQuery.data ?? []).map((t) => (
            <li key={t.id} className="list-item">
              <div>
                <strong>{t.name}</strong>
                <p className="muted small">{t.reportLevel} · {t.dateGranularity}</p>
              </div>
              <div className="list-item-actions">
                <button className="btn btn-link" onClick={() => navigate('template-form', { id: t.id })}>
                  Edit
                </button>
                {!t.isPrebuilt && (
                  <button
                    className="btn btn-link danger"
                    onClick={() => deleteMutation.mutate(t.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
