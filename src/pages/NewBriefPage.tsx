import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loading } from '@/components/ui/loading';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { searchArxiv } from '@/lib/services/arxiv';
import { PaperOperations } from '@/lib/db/operations';
import { BriefOperations } from '@/lib/db/operations';
import type { Paper } from '@/lib/db/schema/paper';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch, 
  faChevronDown, 
  faCheckCircle, 
  faSpinner,
  faRobot,
  faListCheck,
  faFileCode
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import QueryRefinement from '@/components/briefs/QueryRefinement';
import SearchQueryGenerator from '@/components/briefs/SearchQueryGenerator';
import PaperSelector from '@/components/briefs/PaperSelector';

// Extended Paper type with selected property
type PaperWithSelection = Paper & { selected?: boolean };

// Step statuses
type StepStatus = 'pending' | 'active' | 'completed';

const NewBriefPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Form inputs
  const [query, setQuery] = useState('');
  const [keywords, setKeywords] = useState('');
  const [paperCount, setPaperCount] = useState('10');
  
  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  const [stepsStatus, setStepsStatus] = useState<Record<number, StepStatus>>({
    1: 'active',
    2: 'pending',
    3: 'pending',
    4: 'pending'
  });
  
  // Loading and progress states
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Data states
  const [papers, setPapers] = useState<PaperWithSelection[]>([]);
  const [refinedQuery, setRefinedQuery] = useState('');
  const [selectedPapers, setSelectedPapers] = useState<PaperWithSelection[]>([]);
  
  // Query refinement state
  const [showQueryInput, setShowQueryInput] = useState(true);
  const [showQueryRefinement, setShowQueryRefinement] = useState(false);
  
  // Mark a step as complete and advance to the next step
  const completeStep = (step: number) => {
    const newStatus = { ...stepsStatus };
    newStatus[step] = 'completed';
    newStatus[step + 1] = 'active';
    setStepsStatus(newStatus);
    setCurrentStep(step + 1);
  };

  // Handle initial query submission
  const handleInitialQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setShowQueryInput(false);
    setShowQueryRefinement(true);
  };
  
  // Handle refined query from the QueryRefinement component
  const handleRefinedQuery = (refined: string) => {
    setRefinedQuery(refined);
    setShowQueryRefinement(false);
    completeStep(1);
  };

  // Handle papers found by the SearchQueryGenerator
  const handlePapersFound = (foundPapers: Paper[]) => {
    setPapers(foundPapers.map(paper => ({ ...paper, selected: false })));
    completeStep(2);
  };

  // Handle paper selection confirmation
  const handlePaperSelectionConfirmed = (selectedPapers: Paper[]) => {
    setSelectedPapers(selectedPapers);
    completeStep(3);
  };
  
  // Step 4: Generate brief
  const handleGenerateBrief = async () => {
    setIsLoading(true);
    setProgress(0);
    setStatusMessage('Generating research brief...');
    
    try {
      // Prepare papers for brief
      const paperContents = selectedPapers.map(paper => ({
        title: paper.title,
        abstract: paper.abstract,
        authors: paper.authors.join(', '),
        year: paper.year
      }));
      
      // Update progress
      setProgress(20);
      setStatusMessage('Synthesizing content from selected papers...');
      
      // Generate brief title
      const briefTitle = refinedQuery.length > 50 
        ? refinedQuery.substring(0, 50) + '...' 
        : refinedQuery;
      
      // Create brief object
      const briefId = crypto.randomUUID();
      const brief = {
        id: briefId,
        title: briefTitle,
        query: refinedQuery,
        review: JSON.stringify(paperContents), // This is a placeholder, in a real app you would generate the review content
        references: selectedPapers.map(paper => ({
          paperId: paper.id,
          text: `${paper.authors.join(', ')}. ${paper.title}. ${paper.year}.`,
          pdfUrl: paper.pdfUrl
        })),
        bibtex: '', // Placeholder
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Save brief to database
      await BriefOperations.create(brief);
      
      // Update progress
      setProgress(100);
      setStatusMessage('Brief generated successfully.');
      
      // Navigate to brief page
      navigate(`/briefs/${briefId}`);
      
    } catch (error) {
      setIsLoading(false);
      toast.error('Error generating brief: ' + (error as Error).message);
      console.error('Error generating brief:', error);
    }
  };
  
  // Render content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            {showQueryInput && (
              <form onSubmit={handleInitialQuery} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="query">Research Query</Label>
                  <Input
                    id="query"
                    placeholder="Enter your research question or topic"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full"
                    required
                  />
                </div>
                <Button type="submit" disabled={!query.trim()}>
                  <FontAwesomeIcon icon={faRobot} className="mr-2" />
                  Refine Query with AI
                </Button>
              </form>
            )}
            
            {showQueryRefinement && (
              <QueryRefinement
                initialQuery={query}
                onQueryRefined={handleRefinedQuery}
                onBack={() => {
                  setShowQueryRefinement(false);
                  setShowQueryInput(true);
                }}
              />
            )}
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-8">
            <SearchQueryGenerator
              refinedQuery={refinedQuery}
              onSearchComplete={handlePapersFound}
              onCancel={() => {
                setShowQueryRefinement(true);
                setCurrentStep(1);
                const newStatus = { ...stepsStatus };
                newStatus[1] = 'active';
                newStatus[2] = 'pending';
                setStepsStatus(newStatus);
              }}
            />
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-8">
            <PaperSelector 
              papers={papers}
              onSelectionConfirmed={handlePaperSelectionConfirmed}
              onBack={() => {
                setCurrentStep(2);
                const newStatus = { ...stepsStatus };
                newStatus[2] = 'active';
                newStatus[3] = 'pending';
                setStepsStatus(newStatus);
              }}
            />
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Generate Research Brief</h3>
              <p className="text-gray-500">
                You've selected {selectedPapers.length} papers for your research brief.
                The AI will now synthesize these papers to answer your query:
              </p>
              
              <Card>
                <CardHeader>
                  <CardTitle>Research Query</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{refinedQuery}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Selected Papers</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 space-y-2">
                    {selectedPapers.map(paper => (
                      <li key={paper.id}>{paper.title} ({paper.year})</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              
              <Button 
                type="button" 
                onClick={handleGenerateBrief}
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={faFileCode} className="mr-2" />
                Generate Brief
              </Button>
            </div>
            
            {isLoading && (
              <div className="space-y-4">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-gray-500">{statusMessage}</p>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Create Research Brief</h1>
      
      <div className="mb-8">
        <div className="flex items-center">
          {[1, 2, 3, 4].map((step) => (
            <React.Fragment key={step}>
              <div 
                className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  stepsStatus[step] === 'completed' 
                    ? 'bg-primary text-white border-primary' 
                    : stepsStatus[step] === 'active'
                    ? 'border-primary text-primary' 
                    : 'border-gray-300 text-gray-400'
                }`}
              >
                {stepsStatus[step] === 'completed' ? (
                  <FontAwesomeIcon icon={faCheckCircle} />
                ) : (
                  <span>{step}</span>
                )}
              </div>
              
              {step < 4 && (
                <div 
                  className={`flex-1 h-1 ${
                    stepsStatus[step + 1] === 'completed' || stepsStatus[step] === 'completed'
                      ? 'bg-primary'
                      : 'bg-gray-300'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        
        <div className="flex justify-between mt-2">
          <div className="text-sm font-medium w-10 text-center">Query</div>
          <div className="text-sm font-medium w-10 text-center">Search</div>
          <div className="text-sm font-medium w-10 text-center">Select</div>
          <div className="text-sm font-medium w-10 text-center">Brief</div>
        </div>
      </div>
      
      <Card>
        <CardContent className="p-6">
          {renderStepContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default NewBriefPage; 