import type { ArxivSearchParams } from './types';

/**
 * Interface for search query generation
 */
export interface SearchQueryGenerationParams {
  refinedQuery: string;
  maxQueries?: number;
  options?: {
    includeDates?: boolean;
    includeCategories?: boolean;
  };
}

/**
 * Generated search query with metadata
 */
export interface GeneratedSearchQuery {
  query: string;          // The actual query string to send to arXiv
  description: string;    // Human-readable description of what this query targets
  searchParams: ArxivSearchParams; // Formatted params for the arXiv API
}

/**
 * Sanitize arXiv query to make it less restrictive
 * Replaces 'AND' operators inside parentheses with 'OR' operators
 */
function sanitizeQuery(query: string): string {
  let result = '';
  let inParentheses = false;
  let i = 0;
  
  // Process the query character by character to track parentheses
  while (i < query.length) {
    // Track if we're inside parentheses
    if (query[i] === '(') {
      inParentheses = true;
      result += query[i];
    } 
    else if (query[i] === ')') {
      inParentheses = false;
      result += query[i];
    }
    // Check for "AND" inside parentheses and replace with "OR"
    else if (inParentheses && 
        query.substring(i, i + 5).toUpperCase() === ' AND ') {
      result += ' OR ';
      i += 4; // Skip past " AND" (space will be incremented in the loop)
    }
    else if (inParentheses && 
        query.substring(i, i + 4).toUpperCase() === 'AND ') {
      result += 'OR ';
      i += 3; // Skip past "AND" (space will be incremented in the loop)
    }
    else {
      result += query[i];
    }
    i++;
  }
  
  return result;
}

/**
 * Generate arXiv search queries using AI
 * @param llm The LLM completion function
 * @param params The query generation parameters
 * @returns Promise with array of generated queries
 */
export async function generateArxivQueries(
  llm: (prompt: string) => Promise<string>,
  params: SearchQueryGenerationParams
): Promise<GeneratedSearchQuery[]> {
  const {
    refinedQuery,
    maxQueries = 3,
    options = {}
  } = params;

  // Construct the prompt for the AI
  const prompt = `
You are an expert at constructing optimized search queries for the arXiv scientific paper repository.

Research Query: "${refinedQuery}"

Generate ${maxQueries} optimized search queries for arXiv that will help find the most relevant papers. Each query should:
1. Target a different aspect of the research question
2. Use appropriate field prefixes (ti:, au:, abs:, etc.) when applicable
3. Incorporate Boolean operators (AND, OR, ANDNOT) effectively

Available field prefixes:
- ti: Title
- au: Author
- abs: Abstract
- co: Comment
- jr: Journal Reference
- cat: Subject Category
- rn: Report Number
- all: All of the above

Boolean operators: AND, OR, ANDNOT

IMPORTANT FORMATTING: 
- Use normal spaces between search terms and operators
- Correct: "ti:(architecture OR model) AND abs:(ASR AND Whisper)"
- The system will handle URL encoding automatically
- Do not attempt to encode the spaces or special characters yourself

Format your response as a valid JSON array with each object having these fields:
- query: The formatted arXiv query string (with normal spaces)
- description: A brief explanation of what aspect of the research this query targets

Example output format:
[
  {
    "query": "ti:quantum AND abs:computing AND cat:quant-ph",
    "description": "Targeting papers with 'quantum' in title and 'computing' in abstract, limited to quantum physics category"
  }
]

Your response should ONLY contain the valid JSON array and nothing else.
`;

  try {
    // Get AI completion
    const response = await llm(prompt);
    
    // Parse JSON response
    const jsonStartIndex = response.indexOf('[');
    const jsonEndIndex = response.lastIndexOf(']') + 1;
    
    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
      throw new Error("Failed to parse AI response: No JSON array found");
    }
    
    const jsonStr = response.substring(jsonStartIndex, jsonEndIndex);
    const queries = JSON.parse(jsonStr) as Array<{
      query: string;
      description: string;
    }>;
    
    // Convert to GeneratedSearchQuery format with sanitized queries
    return queries.map(item => {
      const sanitizedQuery = sanitizeQuery(item.query);
      console.log(`Original query: "${item.query}"`);
      console.log(`Sanitized query: "${sanitizedQuery}"`);
      return {
        query: sanitizedQuery,
        description: item.description,
        searchParams: {
          query: sanitizedQuery,
          maxResults: 100,
          sortBy: 'relevance',
          sortOrder: 'descending'
        }
      };
    });
  } catch (error) {
    console.error("Error generating arXiv queries:", error);
    
    // Fallback to basic queries if AI fails
    const fallbackQuery = `all:${refinedQuery}`;
    const sanitizedFallbackQuery = sanitizeQuery(fallbackQuery);
    return [{
      query: sanitizedFallbackQuery,
      description: "Basic query searching all fields for the main research topic",
      searchParams: {
        query: sanitizedFallbackQuery,
        maxResults: 100,
        sortBy: 'relevance',
        sortOrder: 'descending'
      }
    }];
  }
} 