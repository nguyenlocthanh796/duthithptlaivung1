/**
 * Empty State Component
 */
import React from 'react';
import { FileText, Search, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: 'file' | 'search' | 'inbox';
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title,
  description,
  action,
}) => {
  const icons = {
    file: FileText,
    search: Search,
    inbox: Inbox,
  };

  const Icon = icons[icon];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
        <Icon className="text-neutral-400" size={32} />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-neutral-600 text-center max-w-md mb-4">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};

export default EmptyState;

