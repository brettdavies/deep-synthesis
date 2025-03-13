import { useState, useEffect } from 'react';
import type { Brief } from '@/lib/db/schema/brief';
import type { BriefEditStep, StepProps } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { useStepLogic } from './useStepLogic';

function QueryStepComponent({ briefId, onComplete }: StepProps) {
  // Use the shared step logic instead of direct useLiveQuery
  const { brief, isLoading, updateBrief } = useStepLogic(briefId);
  
  // Local UI state for the input values
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  
  // Update local state when brief data loads
  useEffect(() => {
    if (brief?.query) {
      setQuery(brief.query);
      // Only set title if it's different from the truncated query
      const truncatedQuery = brief.query.length > 50 ? brief.query.substring(0, 50) + '...' : brief.query;
      if (brief.title !== truncatedQuery) {
        setTitle(brief.title);
      }
    }
  }, [brief?.query, brief?.title]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast.error("Please enter a research question");
      return;
    }
    
    // Use the custom title if provided, otherwise use truncated query
    const briefTitle = title.trim() || (query.length > 50 ? query.substring(0, 50) + '...' : query);
    
    // Use the updateBrief helper from useStepLogic
    const success = await updateBrief({
      query: query.trim(),
      title: briefTitle
    });
    
    if (success) {
      toast.success("Research question saved");
      onComplete();
    }
  };
  
  if (!brief) {
    return <div className="animate-pulse h-32"></div>;
  }
  
  return (
    <div className="query-step">
      <h2 className="text-2xl font-bold mb-4">Define Your Research Question</h2>
      <p className="text-muted-foreground mb-6">
        Enter a research question or topic that you'd like to explore. This will be used to
        guide the literature search and brief generation process.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="query" className="text-sm font-medium">
              Research Question
            </label>
            <Input
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="E.g., What are the recent advances in transformer architectures for NLP?"
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Brief Title <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a custom title for your brief"
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Leave blank to use the research question as the title
            </p>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button type="submit" disabled={!query.trim() || isLoading}>
            {isLoading ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Define the step
export const QueryStep: BriefEditStep = {
  id: 'query',
  title: 'Research Question',
  description: 'Define your research question',
  component: QueryStepComponent,
  // Determine completion based on brief data
  isComplete: (brief: Brief) => !!brief.query && brief.query.trim().length > 0
};

// Do NOT register the step here - it will be registered by the registry
export default QueryStep; 