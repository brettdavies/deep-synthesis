import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { BriefOperations } from '@/lib/db/operations/briefs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BriefEditor } from '@/components/briefs/BriefEditor';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Import QueryStep from the steps directory
import QueryStep from '@/lib/brief/steps/QueryStep';

// Import all step implementations to ensure they are registered
import '@/lib/brief/steps';

interface NewModularBriefPageProps {
  isNew?: boolean;
}

export default function NewModularBriefPage({ isNew = false }: NewModularBriefPageProps) {
  const { briefId } = useParams<{ briefId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCreating, setIsCreating] = useState(false);
  
  // Handle creating a new brief with the provided query
  const createNewBrief = async (query: string) => {
    if (isCreating || !query.trim()) return;
    
    setIsCreating(true);
    
    try {
      // Generate UUID only when user clicks Continue
      const newBriefId = uuidv4();
      
      // Create an initial brief with the query and the new ID
      await BriefOperations.createInitialBrief(query, newBriefId);
      
      // Wait 50ms for transaction to finalize
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Redirect to edit path with the new UUID
      navigate(`/brief/${newBriefId}/edit`, { replace: true });
    } catch (error) {
      console.error('Error creating brief:', error);
      const errorMessage = error instanceof Error ? 
        error.message : 
        'Failed to create a new brief';
      
      toast.error(errorMessage);
      setIsCreating(false);
    }
  };
  
  // Handle completing the query step
  const handleCompleteQueryStep = (query: string) => {
    createNewBrief(query);
  };
  
  // Handle going back (to previous page in history)
  const handleBack = () => {
    navigate(-1);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <h1 className="text-2xl font-bold">
          {isNew ? 'New Brief' : 'Edit Brief'}
        </h1>
        
        <div className="w-[100px]" />
      </div>
      
      {isCreating ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          <span className="ml-3">Creating brief...</span>
        </div>
      ) : briefId ? (
        <BriefEditor briefId={briefId} />
      ) : isNew ? (
        <div className="max-w-2xl mx-auto">
          <QueryStepWithActionButtons onComplete={handleCompleteQueryStep} isSubmitting={isCreating} />
        </div>
      ) : (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      )}
    </div>
  );
}

// A wrapper around QueryStep's component to intercept the onComplete callback
function QueryStepWithActionButtons({ onComplete, isSubmitting = false }: { onComplete: (query: string) => void, isSubmitting?: boolean }) {
  const [query, setQuery] = useState('');
  
  // Handle the original component's onComplete call
  const handleComplete = () => {
    if (query.trim()) {
      onComplete(query.trim());
    }
  };
  
  return (
    <div className="query-step">
      <h2 className="text-2xl font-bold mb-4">Define Your Research Question</h2>
      <p className="text-muted-foreground mb-6">
        Enter a research question or topic that you'd like to explore. This will be used to
        guide the literature search and brief generation process.
      </p>
      
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
            disabled={isSubmitting}
          />
        </div>
        
        <div className="flex justify-end">
          <Button 
            onClick={handleComplete}
            disabled={!query.trim() || isSubmitting}
            className={isSubmitting ? "opacity-80" : ""}
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin mr-2"></div>
                Creating...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 