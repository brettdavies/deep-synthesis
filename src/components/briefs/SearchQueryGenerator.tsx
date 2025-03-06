import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faSpinner, faCheck, faExclamationTriangle, faExternalLinkAlt, faTimes, faRedo, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useLLM } from '@/lib/llm/use-llm';
import { generateArxivQueries, type GeneratedSearchQuery } from '@/lib/services/arxiv/query-generator';
import { rateLimitedBatchSearch } from '@/lib/services/arxiv/rate-limiter';
import type { Paper } from '@/lib/db/schema/paper';
import type { ArxivSearchParams } from '@/lib/services/arxiv/types';
import toast from 'react-hot-toast';
import { PaperOperations } from '@/lib/db/operations';
import { searchArxiv } from '@/lib/services/arxiv/operations';

interface SearchQueryGeneratorProps {
  refinedQuery: string;
  onSearchComplete: (papers: Paper[]) => void;
  onCancel?: () => void;
}

const SearchQueryGenerator: React.FC<SearchQueryGeneratorProps> = ({
  refinedQuery: initialRefinedQuery,
  onSearchComplete,
  onCancel
}) => {
  // Remove quotes if they exist in the initial value
  const cleanInitialQuery = initialRefinedQuery.replace(/^["'](.*)["']$/, '$1');
  const [refinedQuery, setRefinedQuery] = useState(cleanInitialQuery);
  const [isGeneratingQueries, setIsGeneratingQueries] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [generatedQueries, setGeneratedQueries] = useState<GeneratedSearchQuery[]>([]);
  const [selectedQueries, setSelectedQueries] = useState<GeneratedSearchQuery[]>([]);
  const [searchProgress, setSearchProgress] = useState(0);
  const [searchStatus, setSearchStatus] = useState('');
  const [maxResults, setMaxResults] = useState(100);
  // Add state to track which queries are currently opened
  const [openedQueries, setOpenedQueries] = useState<string[]>([]);
  
  const { completeWithAI } = useLLM();
  
  // Initial generation of queries (all will be selected by default)
  const handleInitialGeneration = async () => {
    console.log('Generating queries for:', refinedQuery);
    setIsGeneratingQueries(true);
    
    try {
      const llmWrapper = async (prompt: string) => {
        console.log('Sending prompt to AI:', prompt);
        const response = await completeWithAI('openai', prompt, {
          temperature: 0.3 // Lower temperature for more deterministic responses
        });
        console.log('Received AI response:', response.content);
        return response.content;
      };
      
      const queries = await generateArxivQueries(llmWrapper, {
        refinedQuery,
        maxQueries: 3 // Default to 3 queries
      });
      
      console.log('Generated initial queries:', queries);
      
      // Update state in this order to ensure correct rendering
      setGeneratedQueries(queries);
      setSelectedQueries(queries); // All queries are selected by default
      
      // Generate the list of query IDs to open
      const newOpenedQueries = queries.map((_, i) => `query-${i}`);
      
      // Use setTimeout to ensure the state updates have been applied
      setTimeout(() => {
        setOpenedQueries(newOpenedQueries);
      }, 50);
      
    } catch (error) {
      console.error('Error generating queries:', error);
      toast.error('Failed to generate search queries');
    } finally {
      setIsGeneratingQueries(false);
    }
  };
  
  // Generate search queries with AI - regenerate only unselected ones
  const handleGenerateQueries = async () => {
    console.log('Regenerating unselected queries for:', refinedQuery);
    setIsGeneratingQueries(true);
    
    try {
      const llmWrapper = async (prompt: string) => {
        console.log('Sending prompt to AI:', prompt);
        const response = await completeWithAI('openai', prompt, {
          temperature: 0.3 // Lower temperature for more deterministic responses
        });
        console.log('Received AI response:', response.content);
        return response.content;
      };

      // Store current queries and selected queries
      const currentQueries = [...generatedQueries];
      const selected = [...selectedQueries];
      
      // Only regenerate unselected queries
      const unselectedQueries = currentQueries.filter(q => !selected.includes(q));
      const numQueriesToGenerate = unselectedQueries.length;
      
      console.log(`Regenerating ${numQueriesToGenerate} unselected queries`);
      
      // If there are no unselected queries, no need to regenerate
      if (numQueriesToGenerate === 0) {
        toast.success('All queries are selected. No queries to regenerate.');
        setIsGeneratingQueries(false);
        return;
      }
      
      // Generate new queries to replace the unselected ones
      const newQueries = await generateArxivQueries(llmWrapper, {
        refinedQuery,
        maxQueries: numQueriesToGenerate
      });
      
      console.log('Generated new queries:', newQueries);
      
      // Combine selected queries with new queries
      const updatedQueries = [
        ...selected,                     // Keep all selected queries
        ...newQueries                    // Add the newly generated queries
      ];
      
      // Make sure we don't exceed our limit (typically 3)
      const finalQueries = updatedQueries.slice(0, 3);
      
      // Track which queries are new vs. existing
      const selectedIndices = selected.map(s => finalQueries.indexOf(s));
      const newIndices = newQueries.map(n => finalQueries.indexOf(n));
      
      // Keep opened state for existing queries and add the new ones
      const existingOpenedQueries = openedQueries.filter(id => {
        const index = parseInt(id.replace('query-', ''));
        return selectedIndices.includes(index);
      });
      
      // Add new query IDs to the opened list
      const newOpenedQueries = newIndices.map(i => `query-${i}`);
      
      // Update state first
      setGeneratedQueries(finalQueries);
      setSelectedQueries(selected);
      
      // Use setTimeout to ensure state updates have applied before opening queries
      setTimeout(() => {
        // Update opened queries, combining existing opened and new ones
        setOpenedQueries([...existingOpenedQueries, ...newOpenedQueries]);
      }, 50);
      
    } catch (error) {
      console.error('Error generating queries:', error);
      toast.error('Failed to generate search queries');
    } finally {
      setIsGeneratingQueries(false);
    }
  };
  
  // Toggle selection of a query
  const toggleQuerySelection = (query: GeneratedSearchQuery) => {
    if (selectedQueries.includes(query)) {
      setSelectedQueries(selectedQueries.filter((q) => q !== query));
    } else {
      setSelectedQueries([...selectedQueries, query]);
    }
  };
  
  // Perform the search
  const handleSearch = async () => {
    if (selectedQueries.length === 0) {
      toast.error('Please select at least one search query');
      return;
    }
    
    setIsSearching(true);
    setSearchProgress(0);
    
    try {
      const allPapers: Paper[] = [];
      const queriesCount = selectedQueries.length;
      
      // Function to update progress
      const updateProgress = (currentQuery: number, status: string, progress: number = 0) => {
        const overallProgress = Math.floor((currentQuery - 1) / queriesCount * 100) + Math.floor(progress / queriesCount);
        setSearchProgress(overallProgress);
        setSearchStatus(status);
      };
      
      // Prepare arXiv search params for each query
      const searchParamsArray: ArxivSearchParams[] = selectedQueries.map(query => ({
        query: query.query,
        maxResults,
        sortBy: 'relevance'
      }));
      
      // Search each query
      for (let i = 0; i < selectedQueries.length; i++) {
        const query = selectedQueries[i];
        const queryNumber = i + 1;
        const searchParams = searchParamsArray[i];
        
        updateProgress(queryNumber, `Searching query ${queryNumber}/${queriesCount}: ${query.query}`);
        console.log(`Executing arXiv search for query ${queryNumber}/${queriesCount}:`, searchParams);
        
        try {
          // Use the searchArxiv function directly for better logging and control
          const result = await searchArxiv(searchParams);
          console.log(`Received results for query ${queryNumber}/${queriesCount}:`, result);
          
          // Process the results
          for (const paper of result.papers) {
            updateProgress(queryNumber, `Processing paper: ${paper.title}`);
            
            try {
              // Check if paper already exists
              const existingPaper = await PaperOperations.getByArxivId(paper.arxivId);
              
              if (!existingPaper) {
                // Store paper in database
                await PaperOperations.create(paper);
              }
              
              // Add to results if not already there
              if (!allPapers.some(p => p.arxivId === paper.arxivId)) {
                allPapers.push(paper);
              }
            } catch (error) {
              console.error('Error processing paper:', paper, error);
            }
          }
        } catch (error) {
          console.error(`Error searching query ${queryNumber}/${queriesCount}:`, error);
          toast.error(`Failed to execute query ${queryNumber}`);
        }
        
        updateProgress(queryNumber + 1, `Completed query ${queryNumber}/${queriesCount}`);
      }
      
      // Complete the search
      console.log('Search completed, found papers:', allPapers.length);
      setSearchStatus(`Found ${allPapers.length} papers`);
      setSearchProgress(100);
      
      // Call the onSearchComplete callback
      onSearchComplete(allPapers);
    } catch (error) {
      console.error('Error searching arXiv:', error);
      toast.error('Failed to search arXiv');
    } finally {
      setIsSearching(false);
    }
  };
  
  // Generate a single new query
  const handleAddQuery = async () => {
    console.log('Adding a new query for:', refinedQuery);
    setIsGeneratingQueries(true);
    
    try {
      const llmWrapper = async (prompt: string) => {
        console.log('Sending prompt to AI:', prompt);
        const response = await completeWithAI('openai', prompt, {
          temperature: 0.3 // Lower temperature for more deterministic responses
        });
        console.log('Received AI response:', response.content);
        return response.content;
      };
      
      // Generate just one new query
      const newQuery = await generateArxivQueries(llmWrapper, {
        refinedQuery,
        maxQueries: 1
      });
      
      console.log('Generated new query:', newQuery);
      
      // Add the new query to existing ones
      const updatedQueries = [...generatedQueries, ...newQuery];
      
      // Ensure we don't exceed a reasonable limit (e.g., 5 queries max)
      const finalQueries = updatedQueries.slice(0, 5);
      
      // Set the new index before updating state
      const newIndex = finalQueries.length - 1;
      
      // Update state in this order to ensure correct rendering
      setGeneratedQueries(finalQueries);
      setSelectedQueries([...selectedQueries, ...newQuery]);
      
      // Force update to ensure the new query is opened by adding it to openedQueries
      setTimeout(() => {
        setOpenedQueries(prev => {
          // Make sure we don't add duplicates
          if (!prev.includes(`query-${newIndex}`)) {
            return [...prev, `query-${newIndex}`];
          }
          return prev;
        });
      }, 50);
      
      toast.success('New query added');
    } catch (error) {
      console.error('Error generating new query:', error);
      toast.error('Failed to generate new query');
    } finally {
      setIsGeneratingQueries(false);
    }
  };
  
  // Render query selector
  const renderQuerySelector = () => {
    if (generatedQueries.length === 0) {
      return (
        <div className="text-center p-6">
          <Button 
            onClick={handleInitialGeneration}
            disabled={isGeneratingQueries}
            className="mx-auto"
          >
            {isGeneratingQueries ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                Generating Queries...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSearch} className="mr-2" />
                Generate Search Queries
              </>
            )}
          </Button>
        </div>
      );
    }
    
    // Calculate counts for button labels
    const unselectedCount = generatedQueries.length - selectedQueries.length;
    const selectedCount = selectedQueries.length;
    
    return (
      <div>
        {isGeneratingQueries && (
          <div className="flex items-center justify-center p-4 mb-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <FontAwesomeIcon icon={faSpinner} spin className="mr-2 text-blue-500" />
            <span className="text-sm font-medium">Regenerating search queries...</span>
          </div>
        )}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label htmlFor="maxResults">Maximum Results per Query</Label>
            <Input
              id="maxResults"
              type="number"
              min={10}
              max={500}
              step={10}
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="w-24"
              disabled={isSearching}
            />
          </div>
          
          <Accordion 
            type="multiple" 
            className="w-full" 
            defaultValue={openedQueries}
            onValueChange={(values) => setOpenedQueries(values)}
          >
            {generatedQueries.map((query, index) => (
              <AccordionItem key={index} value={`query-${index}`}>
                <div className="flex items-center">
                  <div 
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-2 cursor-pointer ${
                      selectedQueries.includes(query) 
                        ? 'border-green-500 bg-green-500 text-white' 
                        : 'border-red-500 bg-red-500 text-white'
                    }`}
                    onClick={() => toggleQuerySelection(query)}
                    title={selectedQueries.includes(query) ? "Selected" : "Not selected"}
                  >
                    {selectedQueries.includes(query) 
                      ? <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
                      : <FontAwesomeIcon icon={faTimes} className="h-3 w-3" />
                    }
                  </div>
                  <AccordionTrigger className="flex-1">
                    Query {index + 1}
                  </AccordionTrigger>
                </div>
                <AccordionContent>
                  <div className="space-y-4 p-2">
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Description</h4>
                      <p className="text-sm">{query.description}</p>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="text-sm font-semibold">arXiv Query String</h4>
                        <a 
                          href={`https://export.arxiv.org/api/query?search_query=${query.query}&max_results=${maxResults}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-500 hover:text-blue-700 inline-flex items-center"
                          title="View raw API results in XML format"
                        >
                          View arXiv API Results <FontAwesomeIcon icon={faExternalLinkAlt} className="ml-1 h-3 w-3" />
                        </a>
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm font-mono">
                        {query.query}
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          
          <div className="mt-4 flex justify-between gap-4">
            <Button 
              onClick={handleAddQuery}
              disabled={isGeneratingQueries}
              variant="outline"
              className="w-1/4"
            >
              {isGeneratingQueries ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add New Query
                </>
              )}
            </Button>
            <Button 
              onClick={handleGenerateQueries}
              disabled={isGeneratingQueries || unselectedCount === 0}
              variant="outline"
              className="w-1/4"
            >
              {isGeneratingQueries ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faRedo} className="mr-2" />
                  Regenerate {unselectedCount} {unselectedCount === 1 ? 'Query' : 'Queries'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Search for Papers</CardTitle>
        <CardDescription>
          Generate optimized search queries for arXiv based on your research question
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="refinedQuery">Research Query</Label>
          <Textarea
            id="refinedQuery"
            value={refinedQuery}
            onChange={(e) => setRefinedQuery(e.target.value)}
            className="w-full min-h-[120px]"
            placeholder="Enter your research query here..."
          />
        </div>
        
        {/* Query selection or progress display */}
        {isSearching ? (
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{searchStatus}</span>
              <span className="font-medium">{searchProgress}%</span>
            </div>
            <Progress value={searchProgress} className="w-full" />
          </div>
        ) : (
          renderQuerySelector()
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {onCancel && (
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSearching || isGeneratingQueries}
          >
            Back
          </Button>
        )}
        <div className="flex-1"></div>
        {generatedQueries.length > 0 && !isSearching && (
          <Button 
            onClick={handleSearch}
            disabled={isSearching || selectedQueries.length === 0 || isGeneratingQueries}
            variant="default"
          >
            {isSearching ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                Searching...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSearch} className="mr-2" />
                Search arXiv with {selectedQueries.length} approved {selectedQueries.length === 1 ? 'query' : 'queries'}
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default SearchQueryGenerator; 