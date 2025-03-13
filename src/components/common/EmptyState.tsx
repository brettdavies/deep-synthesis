import { Button } from '@/components/ui/button';
import { FileText, File } from 'lucide-react';

type EmptyStateProps = {
  type: 'papers' | 'briefs';
  onActionClick: () => void;
};

/**
 * EmptyState component for displaying a message when no papers or briefs are available
 */
export function EmptyState({ type, onActionClick }: EmptyStateProps) {
  const title = type === 'papers' 
    ? 'No papers saved' 
    : 'No briefs generated';
  
  const message = type === 'papers'
    ? 'Start by finding papers for your research topic.'
    : 'Start by generating a brief from your research topic.';
  
  const buttonText = type === 'papers'
    ? 'Find Papers'
    : 'Start a New Brief';
  
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