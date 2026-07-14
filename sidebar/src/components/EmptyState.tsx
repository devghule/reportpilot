import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface EmptyStateProps {
  icon: 'template' | 'schedule' | 'sparkles' | 'settings' | 'inbox' | 'calendar' | 'plug';
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon name={icon} size={32} />
      </div>
      <p className="empty-state-title">{title}</p>
      {description && <p className="muted small">{description}</p>}
      {action}
    </div>
  );
}
