import { useState, useEffect, useCallback } from 'react';
import { BriefOperations } from '@/lib/db/operations/briefs';
import { generateUUID } from '@/lib/utils/id/uuid';
import toast from 'react-hot-toast';
import { useLLM } from '@/lib/llm/use-llm';
import type { Brief } from '@/lib/db/schema/brief';
import type { SearchQuery, SearchQueryWithStatus, DateConstraint } from '../types';

export const useSearchQueries = (briefId: string, brief: Brief | null) => {
  const [searchTerms, setSearchTerms] = useState<SearchQueryWithStatus[]>([]);
  const [isGeneratingQueries, setIsGeneratingQueries] = useState(false);
  const [aiDateConstraint, setAiDateConstraint] = useState<DateConstraint | null>(null);
  const { completeWithAI, registry } = useLLM();
  
  // Memoize load functions to prevent recreation on each render
  const loadSearchQueries = useCallback(async (briefId: string) => {
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
  }, []);
  
  const loadDateConstraint = useCallback(async (briefId: string) => {
    try {
      const brief = await BriefOperations.getById(briefId);
      
      if (brief?.dateConstraint) {
        setAiDateConstraint(brief.dateConstraint);
        console.log('Loaded date constraint from brief:', brief.dateConstraint);
      }
    } catch (error) {
      console.error('Error loading date constraint:', error);
    }
  }, []);
  
  // Load saved search queries and date constraints only once when component mounts
  useEffect(() => {
    let isMounted = true;
    
    if (briefId) {
      // Use a Promise.all to load both in parallel
      const loadData = async () => {
        try {
          await Promise.all([
            loadSearchQueries(briefId),
            loadDateConstraint(briefId)
          ]);
        } catch (error) {
          console.error('Error loading data:', error);
        }
      };
      
      loadData();
    }
    
    return () => {
      isMounted = false;
    };
  }, [briefId, loadSearchQueries, loadDateConstraint]);
  
  // Auto-generate queries on first load if none exist (with proper dependencies)
  useEffect(() => {
    if (brief?.query && searchTerms.length === 0 && !isGeneratingQueries) {
      generateSearchQueries();
    }
  }, [brief?.query, searchTerms.length, isGeneratingQueries]);

  // Save search queries to brief - only save persistent data
  const saveSearchQueries = useCallback(async (queries: SearchQueryWithStatus[]) => {
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
  }, [briefId, brief]);
  
  // Save date constraint to brief
  const saveDateConstraint = useCallback(async (constraint: DateConstraint | null) => {
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
  }, [briefId, brief]);
  
  // Handle toggling a search term
  const handleToggleTerm = useCallback((id: string) => {
    const updatedTerms = searchTerms.map(term => 
      term.id === id ? { ...term, isActive: !term.isActive } : term
    );
    
    setSearchTerms(updatedTerms);
    saveSearchQueries(updatedTerms);
  }, [searchTerms, saveSearchQueries]);
  
  // Handle removing a search term
  const handleRemoveTerm = useCallback((id: string) => {
    const updatedTerms = searchTerms.filter(term => term.id !== id);
    setSearchTerms(updatedTerms);
    saveSearchQueries(updatedTerms);
  }, [searchTerms, saveSearchQueries]);

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
        options.responseFormat = {
          type: 'json_object'
        };
      }

      const response = await completeWithAI('openai', prompt, options);
      console.log('Raw AI response:', response.content);

      // Parse the response based on whether structured output was used
      let queries: string[];
      let dateConstraint: DateConstraint | undefined;
      
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
      toast.error(error instanceof Error ? error.message : 'Failed to generate search queries');
    } finally {
      setIsGeneratingQueries(false);
    }
  };
  
  // Update a term's status
  const updateTermStatus = (id: string, status: SearchQueryWithStatus['status'], error?: string) => {
    setSearchTerms(prev => 
      prev.map(term => 
        term.id === id 
          ? { ...term, status, error } 
          : term
      )
    );
  };
  
  return {
    searchTerms,
    setSearchTerms,
    isGeneratingQueries,
    aiDateConstraint,
    handleToggleTerm,
    handleRemoveTerm,
    generateSearchQueries,
    updateTermStatus
  };
}; 