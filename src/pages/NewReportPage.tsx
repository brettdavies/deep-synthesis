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
import { ReportOperations } from '@/lib/db/operations';
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

// Step statuses
type StepStatus = 'pending' | 'active' | 'completed';

// Paper item type (simplified)
interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  year: string;
  pdfUrl: string;
  bibtex: string;
  selected?: boolean;
}

const NewReportPage: React.FC = () => {
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
  const [papers, setPapers] = useState<Paper[]>([]);
  const [refinedQuery, setRefinedQuery] = useState('');
  const [selectedPapers, setSelectedPapers] = useState<Paper[]>([]);
  
  // Mark a step as complete and advance to the next step
  const completeStep = (step: number) => {
    const newStatus = { ...stepsStatus };
    newStatus[step] = 'completed';
    newStatus[step + 1] = 'active';
    setStepsStatus(newStatus);
    setCurrentStep(step + 1);
  };

  // Step 1: Find papers
  const handleFindPapers = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    setIsLoading(true);
    setProgress(0);
    setStatusMessage('Searching arXiv for papers...');
    
    try {
      // Convert paperCount to number
      const maxResults = parseInt(paperCount);
      
      // Search arXiv for papers
      const searchResults = await searchArxiv({
        query: query.trim(),
        maxResults,
        sortBy: 'relevance',
      });
      
      // Update progress
      setProgress(40);
      setStatusMessage(`Found ${searchResults.papers.length} papers. Processing...`);
      
      // Store papers in IndexedDB
      const papers = searchResults.papers;
      const progressIncrement = 40 / papers.length;
      
      for (let i = 0; i < papers.length; i++) {
        const paper = papers[i];
        
        // Update status message
        setStatusMessage(`Processing paper ${i + 1} of ${papers.length}...`);
        
        // Store paper in IndexedDB
        await PaperOperations.create({
          ...paper,
          pdfDownloaded: false,
          pdfDownloadProgress: undefined
        });
        
        // Update progress
        setProgress(40 + (i + 1) * progressIncrement);
      }
      
      // Set papers for the next step
      setPapers(papers);
      
      // Complete step 1 and move to step 2
      completeStep(1);
      setProgress(100);
      setIsLoading(false);
    } catch (error) {
      console.error('Error finding papers:', error);
      setStatusMessage('Error finding papers. Please try again.');
      
      // Show error toast notification
      toast.error(`Failed to find papers: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      setIsLoading(false);
    }
  };

  // Step 2: Refine query with AI
  const handleRefineQuery = async () => {
    setIsLoading(true);
    setProgress(0);
    setStatusMessage('Refining your query with AI...');
    
    try {
      // Mockup for AI refinement - in production, this would call the AI service
      setProgress(50);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Set refined query (mockup)
      const aiRefinedQuery = `${query} (focusing on most recent developments and key breakthroughs)`;
      setRefinedQuery(aiRefinedQuery);
      
      // Complete step 2 and move to step 3
      completeStep(2);
      setProgress(100);
      setIsLoading(false);
    } catch (error) {
      console.error('Error refining query:', error);
      setStatusMessage('Error refining query. Please try again.');
      
      // Show error toast notification
      toast.error(`Failed to refine query: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      setIsLoading(false);
    }
  };

  // Step 3: Select and rank papers
  const handlePaperSelection = (paperId: string) => {
    setPapers(currentPapers => 
      currentPapers.map(paper => 
        paper.id === paperId 
          ? { ...paper, selected: !paper.selected } 
          : paper
      )
    );
  };

  const handleConfirmSelection = () => {
    const selected = papers.filter(paper => paper.selected);
    setSelectedPapers(selected);
    
    if (selected.length === 0) {
      toast.error('Please select at least one paper');
      return;
    }
    
    // Complete step 3 and move to step 4
    completeStep(3);
  };

  // Step 4: Generate report
  const handleGenerateReport = async () => {
    setIsLoading(true);
    setProgress(0);
    setStatusMessage('Generating report...');
    
    try {
      // Update progress
      setProgress(20);
      setStatusMessage('Creating report...');
      
      // Create a new report
      const reportId = await ReportOperations.create({
        title: `Report: ${refinedQuery || query}`,
        query: refinedQuery || query,
        references: selectedPapers.map(paper => ({
          paperId: paper.id,
          text: `${paper.authors.join(', ')}. ${paper.title}. ${paper.year}.`,
          pdfUrl: paper.pdfUrl,
        })),
        bibtex: selectedPapers.map(paper => paper.bibtex).join('\n\n'),
        review: '',
        date: new Date(),
      });
      
      // Complete progress
      setProgress(100);
      setStatusMessage('Report generated!');
      
      // Navigate to the report page
      setTimeout(() => {
        setIsLoading(false);
        navigate(`/report/${reportId}`);
      }, 500);
    } catch (error) {
      console.error('Error generating report:', error);
      setStatusMessage('Error generating report. Please try again.');
      
      // Show error toast notification
      toast.error(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      setIsLoading(false);
    }
  };

  // Render step content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="shadow-lg w-full">
            <CardHeader>
              <CardTitle className="text-2xl">Step 1: Find Papers</CardTitle>
              <CardDescription>
                Enter your research topic to search for relevant papers
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleFindPapers} className="space-y-6">
                {/* Research Topic */}
                <div className="space-y-2">
                  <Label htmlFor="query" className="text-base">Research Topic</Label>
                  <Input
                    id="query"
                    placeholder="e.g., Recent advances in quantum computing"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={isLoading}
                    className="h-12"
                    required
                  />
                </div>

                {/* Keywords */}
                <div className="space-y-2">
                  <Label htmlFor="keywords" className="text-base">Keywords (Optional)</Label>
                  <Input
                    id="keywords"
                    placeholder="e.g., hardware, entanglement"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    disabled={isLoading}
                    className="h-12"
                  />
                </div>

                {/* Paper Count */}
                <div className="space-y-2">
                  <Label htmlFor="paperCount" className="text-base">Number of Papers</Label>
                  <Select 
                    value={paperCount} 
                    onValueChange={setPaperCount}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="paperCount" className="h-12">
                      <SelectValue placeholder="Select number of papers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 papers</SelectItem>
                      <SelectItem value="10">10 papers</SelectItem>
                      <SelectItem value="15">15 papers</SelectItem>
                      <SelectItem value="20">20 papers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Advanced Options */}
                <Collapsible className="w-full">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between">
                      Advanced Options
                      <FontAwesomeIcon icon={faChevronDown} className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-4 space-y-4 bg-gray-50 dark:bg-gray-800 rounded-lg mt-2">
                    <p className="text-sm text-gray-500">Advanced options coming soon...</p>
                  </CollapsibleContent>
                </Collapsible>

                {/* Progress Indicator */}
                {isLoading && (
                  <div className="space-y-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{statusMessage}</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="w-full h-2" />
                  </div>
                )}

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base"
                  disabled={isLoading || !query.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loading size="small" message="" className="mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faSearch} className="mr-2 h-4 w-4" />
                      Find Papers
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card className="shadow-lg w-full">
            <CardHeader>
              <CardTitle className="text-2xl">Step 2: Refine Your Research Question</CardTitle>
              <CardDescription>
                Use AI to refine your research question for better results
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base">Original Query</Label>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <p className="text-base">{query}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <Label className="text-base">Papers Found</Label>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <p className="text-base">{papers.length} papers found</p>
                </div>
              </div>
              
              {/* AI Interaction Chat (Mockup) */}
              <div className="space-y-4">
                <Label className="text-base">AI Assistance</Label>
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                  <div className="flex items-start space-x-3">
                    <FontAwesomeIcon icon={faRobot} className="h-5 w-5 text-blue-500 mt-1" />
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg text-sm flex-1">
                      I can help refine your query for better results. Would you like to focus on specific aspects of "{query}"?
                    </div>
                  </div>
                  
                  {/* AI Chat Input (Mockup) */}
                  <div className="flex">
                    <Input 
                      placeholder="Ask the AI to refine your query..."
                      className="rounded-r-none"
                      disabled={isLoading}
                    />
                    <Button 
                      className="rounded-l-none"
                      disabled={isLoading}
                      onClick={handleRefineQuery}
                    >
                      Send
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Progress Indicator */}
              {isLoading && (
                <div className="space-y-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{statusMessage}</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full h-2" />
                </div>
              )}
              
              {/* Controls */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  disabled={isLoading}
                >
                  Back
                </Button>
                
                <Button
                  onClick={handleRefineQuery}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loading size="small" message="" className="mr-2" />
                      Processing...
                    </>
                  ) : (
                    'Use AI to Refine Query'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card className="shadow-lg w-full">
            <CardHeader>
              <CardTitle className="text-2xl">Step 3: Select Papers</CardTitle>
              <CardDescription>
                Choose which papers to include in your research report
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base">Refined Query</Label>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <p className="text-base">{refinedQuery || query}</p>
                </div>
              </div>
              
              {/* Paper Selection List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base">Select Papers</Label>
                  <span className="text-sm text-gray-500">
                    {papers.filter(p => p.selected).length} of {papers.length} selected
                  </span>
                </div>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {papers.map(paper => (
                    <div 
                      key={paper.id}
                      className={`p-4 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer transition-colors ${paper.selected ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' : ''}`}
                      onClick={() => handlePaperSelection(paper.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <h3 className="font-medium">{paper.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {paper.authors.join(', ')}
                          </p>
                          <p className="text-sm">{paper.abstract.substring(0, 150)}...</p>
                        </div>
                        
                        <div className="ml-4 flex-shrink-0">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paper.selected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                            {paper.selected && (
                              <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Controls */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                >
                  Back
                </Button>
                
                <Button
                  onClick={handleConfirmSelection}
                  disabled={papers.filter(p => p.selected).length === 0}
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card className="shadow-lg w-full">
            <CardHeader>
              <CardTitle className="text-2xl">Step 4: Generate Report</CardTitle>
              <CardDescription>
                Create your research report based on selected papers
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base">Research Focus</Label>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <p className="text-base">{refinedQuery || query}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <Label className="text-base">Selected Papers</Label>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 max-h-[200px] overflow-y-auto">
                  <ul className="space-y-2 list-disc list-inside">
                    {selectedPapers.map(paper => (
                      <li key={paper.id} className="text-sm">
                        {paper.title}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {/* Report Options */}
              <div className="space-y-4">
                <Label htmlFor="reportStyle" className="text-base">Report Style</Label>
                <Select defaultValue="standard">
                  <SelectTrigger id="reportStyle" className="h-12">
                    <SelectValue placeholder="Select report style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Academic</SelectItem>
                    <SelectItem value="simplified">Simplified</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Progress Indicator */}
              {isLoading && (
                <div className="space-y-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{statusMessage}</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full h-2" />
                </div>
              )}
              
              {/* Controls */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                  disabled={isLoading}
                >
                  Back
                </Button>
                
                <Button
                  onClick={handleGenerateReport}
                  disabled={isLoading || selectedPapers.length === 0}
                >
                  {isLoading ? (
                    <>
                      <Loading size="small" message="" className="mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faFileCode} className="mr-2 h-4 w-4" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col overflow-auto">
      <div className="space-y-8 py-6">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Create a New Research Report</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Follow these steps to create a comprehensive literature review
          </p>
        </div>
        
        {/* Steps Progress */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {[1, 2, 3, 4].map((step) => (
            <div 
              key={step}
              className="flex-1"
            >
              <div 
                className={`flex items-center p-4 rounded-lg border ${
                  stepsStatus[step] === 'active' 
                    ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700' 
                    : stepsStatus[step] === 'completed'
                    ? 'bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-700'
                    : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                  stepsStatus[step] === 'active' 
                    ? 'bg-blue-500 text-white' 
                    : stepsStatus[step] === 'completed'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                }`}>
                  {stepsStatus[step] === 'completed' ? (
                    <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4" />
                  ) : stepsStatus[step] === 'active' ? (
                    <span>{step}</span>
                  ) : (
                    <span>{step}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-sm">
                    {step === 1 && 'Find Papers'}
                    {step === 2 && 'Refine Query'}
                    {step === 3 && 'Select Papers'}
                    {step === 4 && 'Generate Report'}
                  </h3>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Current Step Content */}
        <div className="flex-1 overflow-auto min-h-0">
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
};

export default NewReportPage; 