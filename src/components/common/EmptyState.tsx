import { Button } from '@/components/ui/button';
import { FileText, File } from 'lucide-react';

type EmptyStateProps = {
  type: 'papers' | 'reports';
  onActionClick: () => void;
};

/**
 * EmptyState component for displaying a message when no papers or reports are available
 */
export function EmptyState({ type, onActionClick }: EmptyStateProps) {
  const title = type === 'papers' 
    ? 'No papers saved' 
    : 'No reports generated';
  
  const message = type === 'papers'
    ? 'Start by finding papers for your research topic.'
    : 'Start by generating a report from your papers.';
  
  const buttonText = type === 'papers'
    ? 'Find Papers'
    : 'Create Report';
  
  const Icon = type === 'papers' ? File : FileText;

  return (
    <div className="flex flex-col items-center justify-center h-[300px] p-6 text-center">
      <div className="rounded-full bg-muted p-6 mb-4">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6">{message}</p>
      <Button onClick={onActionClick}>{buttonText}</Button>
    </div>
  );
} 