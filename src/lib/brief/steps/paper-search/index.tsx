import { useState } from 'react';
import type { Brief } from '@/lib/db/schema/brief';
import type { BriefEditStep, StepProps } from '../types';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { useStepLogic } from '../useStepLogic';

// Import components
import { QueryEditor } from './components/QueryEditor';
import { SearchQueryList } from './components/SearchQueryList';
import { PaperList } from './components/PaperList';

// Import hooks
import { useSearchQueries } from './hooks/useSearchQueries';
import { usePaperSearch } from './hooks/usePaperSearch';

function PaperSearchStepComponent({ briefId, onComplete, onBack }: StepProps) {
  const { brief, isLoading: isBriefLoading, handleError, updateBrief } = useStepLogic(briefId);
  const [isEditingQuery, setIsEditingQuery] = useState(false);
  const [editedQuery, setEditedQuery] = useState('');
  
  // Handle query editing
  const handleQueryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveQuery();
    } else if (e.key === 'Escape') {
      setIsEditingQuery(false);
      setEditedQuery(brief?.query || '');
    }
  };

  const startEditing = () => {
    setEditedQuery(brief?.query || '');
    setIsEditingQuery(true);
  };

  const handleSaveQuery = async () => {
    if (!editedQuery.trim()) {
      toast.error("Query cannot be empty");
      return;
    }

    try {
      const success = await updateBrief({
        query: editedQuery.trim()
      });

      if (success) {
        setIsEditingQuery(false);
        toast.success("Query updated successfully");
      }
    } catch (error) {
      handleError(error);
    }
  };
  
  // Use the search queries hook
  const {
    searchTerms,
    setSearchTerms,
    isGeneratingQueries,
    aiDateConstraint,
    handleToggleTerm,
    handleRemoveTerm,
    generateSearchQueries,
    updateTermStatus
  } = useSearchQueries(briefId, brief);
  
  // Use the paper search hook
  const {
    papers,
    selectedPapers,
    isLoading,
    sortBy,
    minRelevancyScore,
    currentPage,
    totalPages,
    currentPapers,
    handleTogglePaper,
    handleSearch,
    handleSortChange,
    handleRelevancyScoreChange,
    handlePageChange,
    handleCalculateRelevancy,
    isCalculatingRelevancy
  } = usePaperSearch(briefId, brief, searchTerms, setSearchTerms, aiDateConstraint, handleError);
  
  // Handle continuing to the next step
  const handleContinue = async () => {
    const selectedPaperObjects = papers.filter(paper => paper.isSelected);
    
    if (selectedPaperObjects.length === 0) {
      toast.error("Please select at least one paper");
      return;
    }
    
    // Transform papers to the format expected by the brief schema
    const paperReferences = selectedPaperObjects.map(paper => ({
      paperId: paper.id,
      text: `${paper.authors.join(', ')} (${paper.year}). ${paper.title}`,
      pdfUrl: paper.pdfUrl || ''
    }));
    
    try {
      // Update the brief with the selected papers
      const success = await updateBrief({
        references: paperReferences
      });
      
      if (success) {
        onComplete();
      }
    } catch (error) {
      handleError(error);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Find Relevant Papers</h2>
        
        {/* Research Query Section */}
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Research Query</h3>
          
          {isEditingQuery ? (
            <QueryEditor
              query={brief?.query || ''}
              isEditing={true}
              editedQuery={editedQuery}
              onStartEditing={() => {}}
              onCancelEditing={() => {
                setIsEditingQuery(false);
                setEditedQuery(brief?.query || '');
              }}
              onSaveQuery={handleSaveQuery}
              onEditedQueryChange={setEditedQuery}
              onKeyDown={handleQueryKeyDown}
            />
          ) : (
            <div className="p-4 border rounded-lg bg-card">
              <p className="text-sm">{brief?.query}</p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={startEditing}
                className="mt-2"
              >
                Edit Query
              </Button>
            </div>
          )}
        </div>
        
        {/* Search Terms Section */}
        <div className="space-y-2">
          <SearchQueryList
            searchTerms={searchTerms}
            isGeneratingQueries={isGeneratingQueries}
            aiDateConstraint={aiDateConstraint}
            isLoading={isLoading}
            onToggleTerm={handleToggleTerm}
            onRemoveTerm={handleRemoveTerm}
            onGenerateQueries={generateSearchQueries}
            onSearch={handleSearch}
          />
        </div>
        
        {/* Papers Section */}
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Papers</h3>
          
          <PaperList
            papers={papers}
            isGeneratingQueries={isGeneratingQueries}
            isLoading={isLoading}
            sortBy={sortBy}
            minRelevancyScore={minRelevancyScore}
            currentPage={currentPage}
            totalPages={totalPages}
            currentPapers={currentPapers}
            onSortChange={handleSortChange}
            onRelevancyScoreChange={handleRelevancyScoreChange}
            onPageChange={handlePageChange}
            onTogglePaper={handleTogglePaper}
            onCalculateRelevancy={handleCalculateRelevancy}
            isCalculatingRelevancy={isCalculatingRelevancy}
          />
        </div>
      </div>
      
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={handleContinue}
          disabled={selectedPapers.length === 0}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

// Define the step
export const PaperSearchStep: BriefEditStep = {
  id: 'paper-search',
  title: 'Paper Search',
  description: 'Search for relevant papers',
  component: PaperSearchStepComponent,
  // Only show if we have a query
  shouldRender: (brief) => !!brief.query && brief.query.trim().length > 0,
  // Determine completion based on brief data
  isComplete: (brief: Brief) => brief.references && brief.references.length > 0
};

// Do NOT register the step here - it will be registered by the registry
export default PaperSearchStep; 