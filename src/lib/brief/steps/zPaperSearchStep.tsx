import { useState, useEffect } from 'react';
import type { Brief } from '@/lib/db/schema/brief';
import type { BriefEditStep, StepProps } from './types';
import { BriefOperations } from '@/lib/db/operations/briefs';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Plus, X, Check, AlertCircle, Pencil } from 'lucide-react';
import { useStepLogic } from './useStepLogic';
import { ArxivAPIClient } from '@/lib/api/arxiv';
import { db } from '@/lib/db';
import { withRetry } from '@/lib/utils/api/retry';
import { generateUUID } from '@/lib/utils/id/uuid';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ExternalLinkIcon } from 'lucide-react';
import { useLLM } from "@/lib/llm/use-llm";

// Interface for search terms
interface SearchQuery {
  id: string;
  term: string;
  isActive: boolean;
}

interface SearchQueryWithStatus extends SearchQuery {
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  error?: string;
}

// Interface for search results (papers)
interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  year: string;
  journal?: string;
  pdfUrl?: string;
  isSelected: boolean;
  arxivId?: string;
  relevancyScore?: number;
}

// Add sorting options
type SortOption = 'relevancy' | 'date' | 'title';

function PaperSearchStepComponent({ briefId, onComplete, onBack }: StepProps) {
  const { brief, isLoading, setIsLoading, handleError, updateBrief } = useStepLogic(briefId);
  const { completeWithAI, registry } = useLLM();
  const [isGeneratingQueries, setIsGeneratingQueries] = useState(false);
  const [searchTerms, setSearchTerms] = useState<SearchQueryWithStatus[]>([]);
  const [newTerm, setNewTerm] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPapers, setSelectedPapers] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('relevancy');
  const [minRelevancyScore, setMinRelevancyScore] = useState(80); // Default to highest bucket
  const [aiDateConstraint, setAiDateConstraint] = useState<any>(null);
  const [isEditingQuery, setIsEditingQuery] = useState(false);
  const [editedQuery, setEditedQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAPERS_PER_PAGE = 50;
  
  // Load saved search queries and date constraints when component mounts
  useEffect(() => {
    if (briefId) {
      loadSearchQueries(briefId);
      loadDateConstraint(briefId);
    }
  }, [briefId]);
  
  // Auto-generate queries on first load if none exist
  useEffect(() => {
    if (brief?.query && searchTerms.length === 0 && !isGeneratingQueries) {
      generateSearchQueries();
    }
  }, [brief?.query, searchTerms.length, isGeneratingQueries]);
  
  // Load papers from database when component mounts
  useEffect(() => {
    if (briefId) {
      loadPapersFromDatabase();
    }
  }, [briefId]);
  
  // Save search queries to brief - only save persistent data
  const saveSearchQueries = async (queries: SearchQueryWithStatus[]) => {
    if (!briefId || !brief) return;
    
    try {
      // Only save id, term, and isActive
      const persistentQueries: SearchQuery[] = queries.map(({ id, term, isActive }) => ({
        id,
        term,
        isActive
      }));
      
      await BriefOperations.update(briefId, {
        searchQueries: persistentQueries,
        updatedAt: new Date()
      });
      
      console.log('Saved search queries to brief:', persistentQueries);
    } catch (error) {
      console.error('Error saving search queries:', error);
    }
  };
  
  // Load search queries from brief and initialize with waiting status
  const loadSearchQueries = async (briefId: string) => {
    try {
      const brief = await BriefOperations.getById(briefId);
      
      if (brief?.searchQueries) {
        // Add waiting status to loaded queries
        const queriesWithStatus = brief.searchQueries.map(query => ({
          ...query,
          status: 'waiting' as const,
          error: undefined
        }));
        
        setSearchTerms(queriesWithStatus);
        console.log('Loaded search queries from brief:', queriesWithStatus);
      }
    } catch (error) {
      console.error('Error loading search queries:', error);
    }
  };
  
  // Save date constraint to brief
  const saveDateConstraint = async (constraint: any) => {
    if (!briefId || !brief) return;
    
    try {
      await BriefOperations.update(briefId, {
        dateConstraint: constraint,
        updatedAt: new Date()
      });
      
      console.log('Saved date constraint to brief:', constraint);
    } catch (error) {
      console.error('Error saving date constraint:', error);
    }
  };
  
  // Load date constraint from brief
  const loadDateConstraint = async (briefId: string) => {
    try {
      const brief = await BriefOperations.getById(briefId);
      
      if (brief?.dateConstraint) {
        setAiDateConstraint(brief.dateConstraint);
        console.log('Loaded date constraint from brief:', brief.dateConstraint);
      }
    } catch (error) {
      console.error('Error loading date constraint:', error);
    }
  };
  
  // Handle adding a new search term
  const handleAddTerm = () => {
    if (!newTerm.trim()) return;
    
    const newSearchTerm: SearchQueryWithStatus = {
      id: generateUUID(),
      term: newTerm.trim(),
      isActive: true,
      status: 'waiting'
    };
    
    const updatedTerms = [...searchTerms, newSearchTerm];
    setSearchTerms(updatedTerms);
    saveSearchQueries(updatedTerms);
    setNewTerm('');
  };
  
  // Handle toggling a search term
  const handleToggleTerm = (id: string) => {
    const updatedTerms = searchTerms.map(term => 
      term.id === id ? { ...term, isActive: !term.isActive } : term
    );
    
    setSearchTerms(updatedTerms);
    saveSearchQueries(updatedTerms);
  };
  
  // Handle removing a search term
  const handleRemoveTerm = (id: string) => {
    const updatedTerms = searchTerms.filter(term => term.id !== id);
    setSearchTerms(updatedTerms);
    saveSearchQueries(updatedTerms);
  };
  
  // Handle paper selection
  const handleTogglePaper = async (paperId: string) => {
    try {
      // Update UI state
      setPapers(prev => 
        prev.map(paper => 
          paper.id === paperId ? { ...paper, isSelected: !paper.isSelected } : paper
        )
      );
      
      setSelectedPapers(prev => {
        if (prev.includes(paperId)) {
          return prev.filter(id => id !== paperId);
        } else {
          return [...prev, paperId];
        }
      });

      // Get the current paper's selection state
      const paper = papers.find(p => p.id === paperId);
      const newIsSelected = !paper?.isSelected;

      // Update the association in the database
      await db.transaction('rw', [db.paperBriefAssociations], async () => {
        const association = await db.paperBriefAssociations
          .where({
            briefId,
            paperId
          })
          .first();

        if (association) {
          await db.paperBriefAssociations.update(association.id, {
            isSelected: newIsSelected,
            updatedAt: new Date()
          });
          console.log('Updated paper selection in database:', { paperId, isSelected: newIsSelected });
        } else {
          // If no association exists, create one
          const newAssociation = {
            id: generateUUID(),
            briefId,
            paperId,
            isSelected: newIsSelected,
            searchQuery: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };
          await db.paperBriefAssociations.add(newAssociation);
          console.log('Created new paper association in database:', newAssociation);
        }
      });

    } catch (error) {
      console.error('Error updating paper selection:', error);
      handleError(error);
      // Revert UI state on error
      setPapers(prev => 
        prev.map(paper => 
          paper.id === paperId ? { ...paper, isSelected: !paper.isSelected } : paper
        )
      );
      setSelectedPapers(prev => 
        prev.includes(paperId) 
          ? prev.filter(id => id !== paperId)
          : [...prev, paperId]
      );
      toast.error('Failed to update paper selection');
    }
  };
  
  // Format date constraints for display in search queries
  const formatDateConstraintForDisplay = (constraint?: any): string => {
    if (!constraint || constraint.type === 'none') return '';
    
    const formatDate = (dateStr?: string | null) => {
      if (!dateStr) return '';
      // Convert YYYY-MM-DD to YYYYMMDD format for arXiv API
      return dateStr.replace(/-/g, '');
    };
    
    switch (constraint.type) {
      case 'before':
        return ` AND submittedDate:[* TO ${formatDate(constraint.beforeDate)}]`;
      case 'after':
        return ` AND submittedDate:[${formatDate(constraint.afterDate)} TO *]`;
      case 'between':
        return ` AND submittedDate:[${formatDate(constraint.afterDate)} TO ${formatDate(constraint.beforeDate)}]`;
      default:
        return '';
    }
  };
  
  // Get the full search query with date constraints
  const getFullSearchQuery = (term: string): string => {
    return addDateConstraints(term, aiDateConstraint);
  };
  
  // Function to get API preview URL for a query
  function getApiPreviewUrl(query: string): string {
    // Use the full search query with date constraints
    const fullQuery = addDateConstraints(query, aiDateConstraint);
    return `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(fullQuery)}`;
  }
  
  // Function to load papers from database
  const loadPapersFromDatabase = async () => {
    try {
      // Get all paper associations for this brief
      const associations = await db.paperBriefAssociations
        .where('briefId')
        .equals(briefId)
        .toArray();

      if (associations.length > 0) {
        // Get all paper IDs
        const paperIds = associations.map(assoc => assoc.paperId);
        
        // Get all papers
        const papers = await db.papers
          .where('id')
          .anyOf(paperIds)
          .toArray();

        // Map papers to include isSelected state from associations
        const papersWithSelection = papers.map(paper => {
          const association = associations.find(assoc => assoc.paperId === paper.id);
          return {
            ...paper,
            isSelected: association?.isSelected || false,
            relevancyScore: association?.relevancyScore
          };
        });

        // Update papers state and selected papers
        setPapers(papersWithSelection);
        setSelectedPapers(
          papersWithSelection
            .filter(paper => paper.isSelected)
            .map(paper => paper.id)
        );

        console.log('Loaded papers from database:', papersWithSelection);
      }
    } catch (error) {
      console.error('Error loading papers from database:', error);
      handleError(error);
    }
  };
  
  // Handle searching for papers
  const handleSearch = async () => {
    const activeTerms = searchTerms.filter(term => term.isActive);
    
    if (activeTerms.length === 0) {
      toast.error("Please add at least one active search query");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Clear previous results
      setPapers([]);
      setSelectedPapers([]);
      
      const arxivClient = new ArxivAPIClient();
      const processedPapers = new Set<string>(); // Track papers by arxivId
      
      // Process each active term sequentially
      for (const term of activeTerms) {
        try {
          // Update term status to processing (only in UI state)
          const updatedTerms = searchTerms.map(t => 
            t.id === term.id 
              ? { ...t, status: 'processing' as const, error: undefined }
              : t
          );
          setSearchTerms(updatedTerms);
          
          // Add date constraints to query
          const searchQuery = addDateConstraints(term.term, aiDateConstraint);
          console.log('Final search query with date constraints:', searchQuery);
          
          // Search arXiv with retry logic
          const response = await withRetry(() => 
            arxivClient.search({
              query: searchQuery,
              maxResults: 100,
              sortBy: 'relevance',
              sortOrder: 'descending'
            })
          );
          
          // Filter out duplicates and add new papers
          const newPapers = response.papers.filter(paper => {
            if (processedPapers.has(paper.arxivId)) {
              return false;
            }
            processedPapers.add(paper.arxivId);
            return true;
          });
          
          // Save papers to database
          await db.transaction('rw', [db.papers, db.paperBriefAssociations], async () => {
            for (const paper of newPapers) {
              // Check if paper already exists
              const existingPaper = await db.papers.where({ arxivId: paper.arxivId }).first();
              
              if (!existingPaper) {
                await db.papers.add(paper);
              }
              
              // Create or update association
              const association = {
                id: generateUUID(),
                briefId,
                paperId: paper.id,
                searchQuery: [term.term],
                isSelected: false,
                createdAt: new Date(),
                updatedAt: new Date()
              };
              
              await db.paperBriefAssociations.put(association);
            }
          });
          
          // Add papers to UI state - merge with existing papers
          setPapers(prev => {
            const newPapersMap = new Map(newPapers.map(p => [p.id, { 
              ...p, 
              isSelected: false,
              relevancyScore: undefined // Will be set later by calculateRelevancyScores
            }]));
            const existingPapers = prev.filter(p => !newPapersMap.has(p.id));
            return [...existingPapers, ...newPapersMap.values()];
          });
          
          // Update term status to completed (only in UI state)
          const completedTerms = searchTerms.map(t => 
            t.id === term.id 
              ? { ...t, status: 'completed' as const }
              : t
          );
          setSearchTerms(completedTerms);
          
        } catch (error) {
          // Update term status to failed (only in UI state)
          const failedTerms = searchTerms.map(t => 
            t.id === term.id 
              ? { 
                  ...t, 
                  status: 'failed' as const, 
                  error: error instanceof Error ? error.message : 'Search failed'
                }
              : t
          );
          setSearchTerms(failedTerms);
          
          console.error(`Error searching term "${term.term}":`, error);
        }
      }
      
      const totalFound = processedPapers.size;
      toast.success(`Found ${totalFound} unique papers`);
    } catch (error) {
      console.error('Error during search:', error);
      toast.error("Search failed");
    } finally {
      setIsLoading(false);
    }
  };
  
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
    
    // Save the selected papers to the brief using updateBrief
    const success = await updateBrief({
      references: paperReferences
    });
    
    if (success) {
      toast.success(`Saved ${selectedPaperObjects.length} papers`);
      onComplete();
    }
  };
  
  // Calculate paper counts by relevancy bucket
  const paperCounts = papers.reduce((acc, paper) => {
    if (paper.relevancyScore === undefined) {
      acc.unscored = (acc.unscored || 0) + 1;
    } else if (paper.relevancyScore >= 80) {
      acc['80-100'] = (acc['80-100'] || 0) + 1;
    } else if (paper.relevancyScore >= 60) {
      acc['60-79'] = (acc['60-79'] || 0) + 1;
    } else if (paper.relevancyScore >= 40) {
      acc['40-59'] = (acc['40-59'] || 0) + 1;
    } else if (paper.relevancyScore >= 20) {
      acc['20-39'] = (acc['20-39'] || 0) + 1;
    } else {
      acc['0-19'] = (acc['0-19'] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Update the filteredPapers section to include pagination
  const filteredPapers = papers
    .filter(paper => paper.relevancyScore === undefined || paper.relevancyScore >= minRelevancyScore)
    .sort((a, b) => {
      switch (sortBy) {
        case 'relevancy':
          if (a.relevancyScore === undefined && b.relevancyScore === undefined) return 0;
          if (a.relevancyScore === undefined) return 1;
          if (b.relevancyScore === undefined) return -1;
          return b.relevancyScore - a.relevancyScore;
        case 'date':
          return parseInt(b.year) - parseInt(a.year);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  // Get current papers for the page
  const indexOfLastPaper = currentPage * PAPERS_PER_PAGE;
  const indexOfFirstPaper = indexOfLastPaper - PAPERS_PER_PAGE;
  const currentPapers = filteredPapers.slice(indexOfFirstPaper, indexOfLastPaper);
  const totalPages = Math.ceil(filteredPapers.length / PAPERS_PER_PAGE);

  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0); // Scroll to top when changing pages
  };

  // Reset to first page when sorting or filtering changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, minRelevancyScore]);

  // Function to generate search queries using AI
  const generateSearchQueries = async () => {
    if (!brief?.query) {
      toast.error('No query available');
      return;
    }
    
    setIsGeneratingQueries(true);
    
    try {
      console.log('Generating queries for:', brief.query);
      
      // Keep track of active/checked queries
      const activeQueries = searchTerms.filter(term => term.isActive);
      console.log('Preserving active queries:', activeQueries);
      
      // Get the currently selected model's capabilities
      const openaiSettings = registry.getProviderSettings('openai');
      const selectedModelId = openaiSettings?.selectedModel;
      console.log('Selected model ID:', selectedModelId);
      
      // Find the model in the list of all OpenAI models
      const openaiProvider = registry.getProvider('openai');
      const allModels = openaiProvider.getModels();
      const selectedModel = allModels.find(model => model.id === selectedModelId);
      
      console.log('Selected model capabilities:', selectedModel?.capabilities);
      
      // Determine if using structured output is appropriate
      const supportsStructuredOutput = selectedModel?.capabilities.structuredOutput;
      const supportsJsonMode = selectedModel?.capabilities.jsonMode;
      
      const prompt = `You are a research assistant helping to generate arXiv search queries.

<instructions>
Please generate 3 different arXiv search queries that would help find relevant academic papers for this research topic.
Each query should focus on a different aspect or subtopic of the research question.

Your task is to:
1. Generate effective search queries using arXiv API syntax 
2. Extract any date constraints mentioned in the research query

Date handling rules:
- If the query mentions dates, extract them into the dateConstraint object
- If a specific day is not mentioned, use the 1st of the month (01)
- If a specific month is not mentioned, use January (01-01)
- For seasons: Spring=03-01, Summer=06-01, Fall=09-01, Winter=12-01

${supportsStructuredOutput || supportsJsonMode ? 
  `Your response MUST be a valid JSON object with:
   - A "queries" property containing an array of strings, where each string is a search query
   - A "dateConstraint" property (if dates are mentioned) with:
     * "type": one of ["none", "before", "after", "between"]
     * "beforeDate": formatted as YYYY-MM-DD (for "before" or "between" types)
     * "afterDate": formatted as YYYY-MM-DD (for "after" or "between" types)` : 
  `Format your response as a JSON object with "queries" (array of strings) and optionally a "dateConstraint" object.
Your response will be parsed as JSON, so ensure it's properly formatted.`}

arXiv query syntax guidelines:
1. Use field prefixes (e.g., ti:, abs:, au:) for targeted field searches
2. Use Boolean operators (AND, OR, ANDNOT) in UPPERCASE
3. Use parentheses to group related terms
</instructions>

<research_query>
${brief.query}
</research_query>`;

      // Create options object with responseFormat if supported
      const options: any = {
        temperature: 0.7,
        maxTokens: 5000
      };
      
      // Add response format for structured output if supported
      if (supportsStructuredOutput) {
        console.log('Using structured output format');
        // Define schema for search queries and dateConstraint
        options.responseFormat = {
          type: 'json_schema',
          json_schema: {
            name: 'arxiv_search_queries',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                queries: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                },
                dateConstraint: {
                  type: 'object',
                  properties: {
                    type: { 
                      type: 'string', 
                      enum: ['none', 'before', 'after', 'between']
                    },
                    beforeDate: { 
                      type: 'string',
                      nullable: true
                    },
                    afterDate: { 
                      type: 'string',
                      nullable: true
                    }
                  },
                  required: ['type', 'beforeDate', 'afterDate'],
                  additionalProperties: false
                }
              },
              required: ['queries', 'dateConstraint'],
              additionalProperties: false
            }
          }
        };
      } else if (supportsJsonMode) {
        console.log('Using simple JSON object format');
        // Use simple JSON mode if available
        options.responseFormat = {
          type: 'json_object'
        };
      } else {
        console.log('Model does not support structured output or JSON mode');
      }

      const response = await completeWithAI('openai', prompt, options);

      console.log('Raw AI response:', response.content);

      // Parse the response based on whether structured output was used
      let queries: string[];
      let dateConstraint: {
        type: 'none' | 'before' | 'after' | 'between';
        beforeDate?: string | null;
        afterDate?: string | null;
      } | undefined;
      
      try {
        // For models with json_mode or structured_output, the response should be valid JSON already
        if (selectedModel?.capabilities.structuredOutput || selectedModel?.capabilities.jsonMode) {
          try {
            // Direct JSON parsing for structured output
            const parsedResponse = JSON.parse(response.content);
            console.log('Successfully parsed JSON response:', parsedResponse);
            
            // Extract queries and dateConstraint
            if (parsedResponse && typeof parsedResponse === 'object') {
              if (Array.isArray(parsedResponse.queries)) {
                queries = parsedResponse.queries;
                console.log('Extracted queries:', queries);
                
                // Extract date constraint if present
                if (parsedResponse.dateConstraint) {
                  dateConstraint = parsedResponse.dateConstraint;
                  console.log('Extracted date constraint:', dateConstraint);
                }
              } else {
                console.error('Unexpected response format - queries is not an array:', parsedResponse);
                throw new Error('Response is not in the expected format');
              }
            } else {
              console.error('Unexpected response format:', parsedResponse);
              throw new Error('Response is not in the expected format');
            }
          } catch (jsonError) {
            console.error('Failed to parse JSON response:', jsonError);
            // Sometimes even with json_mode, the model might return additional text
            // Try to extract JSON array using regex as fallback
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              console.log('Found JSON object in response using regex:', jsonMatch[0]);
              const parsedResponse = JSON.parse(jsonMatch[0]);
              queries = parsedResponse.queries || [];
              dateConstraint = parsedResponse.dateConstraint;
            } else {
              throw new Error('Could not parse response as JSON object');
            }
          }
        } else {
          // Legacy handling for models without structured output
          console.log('Using legacy XML content extraction');
          // Extract the JSON content from the XML-like response
          const contentMatch = response.content.match(/<content>\s*([\s\S]*?)\s*<\/content>/);
          let jsonContent;
          
          if (contentMatch) {
            jsonContent = contentMatch[1];
            console.log('Extracted content from XML tags:', jsonContent);
          } else {
            // Try to find a JSON object anywhere in the response
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              jsonContent = jsonMatch[0];
              console.log('Found JSON object using regex:', jsonContent);
            } else {
              // Fallback to treating the entire response as JSON
              jsonContent = response.content;
              console.log('Using entire response as JSON');
            }
          }
          
          const parsedResponse = JSON.parse(jsonContent);
          queries = parsedResponse.queries || [];
          dateConstraint = parsedResponse.dateConstraint;
        }
        
        // Validate the parsed response
        if (!Array.isArray(queries)) {
          console.error('AI response queries is not an array:', queries);
          throw new Error('AI response was not in the expected format (array of strings)');
        }

        if (queries.length === 0) {
          throw new Error('No valid queries were generated');
        }

        // Validate each query is a string
        if (!queries.every(q => typeof q === 'string')) {
          console.error('Some queries are not strings:', queries);
          throw new Error('All queries must be strings');
        }

        // Create new queries in inactive state
        const newQueries = queries.map(query => ({
          id: generateUUID(),
          term: query.trim(),
          isActive: false, // Start as inactive
          status: 'waiting' as const
        }));

        // Combine active queries with new ones
        const combinedQueries = [...activeQueries, ...newQueries];
        console.log('Combined queries:', combinedQueries);
        
        // Store the date constraint if present for later use when performing the search
        if (dateConstraint && dateConstraint.type !== 'none') {
          setAiDateConstraint(dateConstraint);
          saveDateConstraint(dateConstraint);
          console.log('Storing date constraint for search:', dateConstraint);
        } else {
          setAiDateConstraint(null);
          saveDateConstraint(null);
        }
        
        setSearchTerms(combinedQueries);
        saveSearchQueries(combinedQueries);
        
        toast.success('Generated new search queries');
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        console.log('Response content that failed to parse:', response.content);
        throw new Error('AI response was not valid JSON. Please try again.');
      }
    } catch (error) {
      console.error('Error generating search queries:', error);
      // Log specific error details if available
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      handleError(error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate search queries');
    } finally {
      setIsGeneratingQueries(false);
    }
  };

  // Update the addDateConstraints function to add better log messages for debugging
  const addDateConstraints = (query: string, aiDateConstraint?: any): string => {
    console.log('Adding date constraints to query:', query);
    console.log('Date constraint being applied:', aiDateConstraint);
    
    if (!aiDateConstraint || aiDateConstraint.type === 'none') {
      // Check if there are date constraints in the brief
      if (!brief?.dateConstraints) return query;

      const { beforeDate, afterDate, startDate, endDate } = brief.dateConstraints;
      
      const formatDate = (date: Date) => date.toISOString().split('T')[0].replace(/-/g, '');
      
      if (beforeDate) {
        query += ` AND submittedDate:[* TO ${formatDate(beforeDate)}]`;
      }
      
      if (afterDate) {
        query += ` AND submittedDate:[${formatDate(afterDate)} TO *]`;
      }
      
      if (startDate && endDate) {
        query += ` AND submittedDate:[${formatDate(startDate)} TO ${formatDate(endDate)}]`;
      }
      
      return query;
    }
    
    // Process AI-extracted date constraints
    const formatDateString = (dateStr: string | null | undefined) => {
      if (!dateStr) return null;
      return dateStr.replace(/-/g, ''); // Convert YYYY-MM-DD to YYYYMMDD
    };
    
    let dateQuery = query;
    
    switch (aiDateConstraint.type) {
      case 'before':
        if (aiDateConstraint.beforeDate) {
          const formattedDate = formatDateString(aiDateConstraint.beforeDate);
          if (formattedDate) {
            dateQuery += ` AND submittedDate:[* TO ${formattedDate}]`;
            console.log('Added before date constraint:', dateQuery);
          }
        }
        break;
        
      case 'after':
        if (aiDateConstraint.afterDate) {
          const formattedDate = formatDateString(aiDateConstraint.afterDate);
          if (formattedDate) {
            dateQuery += ` AND submittedDate:[${formattedDate} TO *]`;
            console.log('Added after date constraint:', dateQuery);
          }
        }
        break;
        
      case 'between':
        if (aiDateConstraint.afterDate && aiDateConstraint.beforeDate) {
          const fromDate = formatDateString(aiDateConstraint.afterDate);
          const toDate = formatDateString(aiDateConstraint.beforeDate);
          if (fromDate && toDate) {
            dateQuery += ` AND submittedDate:[${fromDate} TO ${toDate}]`;
            console.log('Added between date constraint:', dateQuery);
          }
        }
        break;
    }
    
    return dateQuery;
  };

  // Handle saving the edited query
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

  // Handle keyboard events for the query input
  const handleQueryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveQuery();
    } else if (e.key === 'Escape') {
      setIsEditingQuery(false);
      setEditedQuery(brief?.query || '');
    }
  };

  // Start editing and initialize the edit value
  const startEditing = () => {
    setEditedQuery(brief?.query || '');
    setIsEditingQuery(true);
  };

  if (!brief) {
    return <div className="animate-pulse h-32"></div>;
  }
  
  return (
    <div className="paper-search-step">
      <h2 className="text-2xl font-bold mb-4">Search for Papers</h2>
      <p className="text-muted-foreground mb-6">
        Search for relevant papers to include in your brief. Use AI-generated arXiv search queries to find papers that best match your research question.
      </p>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            {isEditingQuery ? (
              <>
                <Input
                  value={editedQuery}
                  onChange={(e) => setEditedQuery(e.target.value)}
                  onKeyDown={handleQueryKeyDown}
                  placeholder="Enter your research query..."
                  className="flex-grow"
                  autoFocus
                />
                <Button
                  size="icon"
                  className="h-10 w-10"
                  onClick={handleSaveQuery}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-10 w-10"
                  onClick={() => {
                    setIsEditingQuery(false);
                    setEditedQuery(brief.query || '');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium flex-grow">{brief.query}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startEditing}
                  className="h-8 w-8 p-0 -mt-1"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="search-queries-section mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Search Queries</h3>
          <Button 
            onClick={generateSearchQueries} 
            variant="outline" 
            disabled={isGeneratingQueries}
          >
            {isGeneratingQueries ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Generate New Queries
              </>
            )}
          </Button>
        </div>
        
        <div className="search-queries-list space-y-2 mb-4">
          {searchTerms.map(query => (
            <div 
              key={query.id} 
              className={`flex items-center space-x-2 p-3 border rounded ${
                query.status === 'processing' ? 'bg-blue-50 border-blue-200' :
                query.status === 'completed' ? 'bg-green-50 border-green-200' :
                query.status === 'failed' ? 'bg-red-50 border-red-200' :
                'bg-white'
              }`}
            >
              <Checkbox 
                checked={query.isActive} 
                onCheckedChange={() => handleToggleTerm(query.id)} 
                id={`query-${query.id}`}
                disabled={query.status === 'processing'}
              />
              <div className="flex-grow">
                <label 
                  htmlFor={`query-${query.id}`}
                  className="block font-mono text-sm cursor-pointer"
                >
                  {query.term}{aiDateConstraint && aiDateConstraint.type !== 'none' && formatDateConstraintForDisplay(aiDateConstraint)}
                </label>
                {query.status === 'failed' && (
                  <p className="text-sm text-red-600 mt-1">
                    Error: {query.error}
                  </p>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {query.status === 'processing' && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                )}
                {query.status === 'completed' && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
                {query.status === 'failed' && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                
                <a 
                  href={getApiPreviewUrl(query.term)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700"
                  title="Preview API results"
                >
                  <ExternalLinkIcon className="h-4 w-4" />
                </a>
                
                <button 
                  onClick={() => handleRemoveTerm(query.id)}
                  className="text-gray-400 hover:text-red-500"
                  title="Remove query"
                  disabled={query.status === 'processing'}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          
          {searchTerms.length === 0 && !isGeneratingQueries && (
            <p className="text-gray-500 italic text-center py-8">
              Click "Generate New Queries" to get started
            </p>
          )}
        </div>
        
        <Button 
          onClick={handleSearch} 
          disabled={isGeneratingQueries || searchTerms.filter(q => q.isActive).length === 0}
          className="w-full"
        >
          {isGeneratingQueries ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Search Selected Queries
            </>
          )}
        </Button>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">
            Search Results {papers.length > 0 && `(${papers.length} papers)`}
          </h3>
          
          <div className="flex items-center space-x-4">
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortOption)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevancy">Sort by Relevancy</SelectItem>
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="title">Sort by Title</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={minRelevancyScore.toString()}
              onValueChange={(value) => setMinRelevancyScore(parseInt(value))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by relevancy..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="80">80-100 ({paperCounts['80-100'] || 0})</SelectItem>
                <SelectItem value="60">60-79 ({paperCounts['60-79'] || 0})</SelectItem>
                <SelectItem value="40">40-59 ({paperCounts['40-59'] || 0})</SelectItem>
                <SelectItem value="20">20-39 ({paperCounts['20-39'] || 0})</SelectItem>
                <SelectItem value="0">0-19 ({paperCounts['0-19'] || 0})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {papers.length === 0 && !isGeneratingQueries && (
          <div className="p-8 text-center text-muted-foreground border rounded-lg">
            No papers found. Try searching with different terms.
          </div>
        )}
        
        {isGeneratingQueries && (
          <div className="p-8 text-center border rounded-lg">
            <Loader2 size={24} className="animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Generating search queries...</p>
          </div>
        )}
        
        <div className="space-y-4">
          {currentPapers.map(paper => (
            <Card 
              key={paper.id}
              className={`${paper.isSelected ? 'border-primary' : ''} ${
                paper.relevancyScore === undefined ? 'opacity-70' :
                paper.relevancyScore < 20 ? 'opacity-50' : ''
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <Checkbox 
                    id={`paper-${paper.id}`}
                    checked={paper.isSelected}
                    onCheckedChange={() => handleTogglePaper(paper.id)}
                    className="mt-1"
                  />
                  
                  {paper.relevancyScore !== undefined && (
                    <Badge 
                      variant={
                        paper.relevancyScore >= 80 ? 'default' :
                        paper.relevancyScore >= 60 ? 'secondary' :
                        paper.relevancyScore >= 40 ? 'outline' :
                        'destructive'
                      }
                      className="w-16 justify-center"
                    >
                      {paper.relevancyScore}%
                    </Badge>
                  )}
                  
                  <div className="flex-grow">
                    <CardTitle className="text-base">
                      <Label htmlFor={`paper-${paper.id}`} className="cursor-pointer">
                        {paper.title}
                      </Label>
                    </CardTitle>
                    <div className="text-sm text-muted-foreground mt-1">
                      {paper.authors.join(', ')} • {paper.year}
                      {paper.journal && ` • ${paper.journal}`}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-2">
                <p className="text-sm line-clamp-3">{paper.abstract}</p>
              </CardContent>
              
              <CardFooter className="flex gap-4">
                {paper.pdfUrl && (
                  <a 
                    href={paper.pdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center"
                  >
                    View PDF
                  </a>
                )}
                {paper.arxivId && (
                  <a 
                    href={`https://arxiv.org/abs/${paper.arxivId}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center"
                  >
                    View on arXiv
                  </a>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <Button
                  key={pageNum}
                  variant={pageNum === currentPage ? "default" : "outline"}
                  onClick={() => handlePageChange(pageNum)}
                  className="w-10"
                >
                  {pageNum}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
      
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={handleContinue}
          disabled={selectedPapers.length === 0}
        >
          Continue with {selectedPapers.length} papers
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