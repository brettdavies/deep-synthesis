# Brief Generation Utilities

This module provides shared utility functions for generating research briefs using AI. These functions are used in multiple places in the application, including the brief generation step in the creation flow and the regenerate functionality on the brief view page.

## Functions

### `generateBrief`

Generates a research brief using AI based on the provided brief data.

```typescript
async function generateBrief(
  brief: Brief,
  completeWithAI: (
    providerName: string, 
    prompt: string, 
    options?: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      reasoningEffort?: 'high' | 'medium' | 'low';
      responseFormat?: {
        type: 'json_object' | 'json_schema';
        json_schema?: {
          name: string;
          strict: boolean;
          schema: Record<string, any>;
        };
      };
    }
  ) => Promise<LLMResponse>
): Promise<{ success: boolean; content?: string; bibtex?: string }>
```

#### Parameters:
- `brief`: The brief object containing query and references
- `completeWithAI`: Function to call the AI with the specified provider, prompt, and options

#### Returns:
- Object containing:
  - `success`: Boolean indicating if the generation was successful
  - `content`: The generated brief content (if successful)
  - `bibtex`: The generated BibTeX references (if successful)

#### Process:
1. Validates that the brief has references
2. Fetches full paper data for each reference to get abstracts
3. Prepares paper data for the AI, including titles, authors, years, and abstracts
4. Creates system and user messages
5. Logs the user message for debugging
6. Calls the AI with the combined prompt
7. Generates BibTeX from the paper data
8. Returns the results

### `updateBriefWithGeneratedContent`

Updates a brief with the generated content and BibTeX.

```typescript
async function updateBriefWithGeneratedContent(
  briefId: string,
  content: string,
  bibtex: string,
  workflow: 'generate' | 'regenerate' = 'generate'
): Promise<boolean>
```

#### Parameters:
- `briefId`: The ID of the brief to update
- `content`: The generated content
- `bibtex`: The generated BibTeX
- `workflow`: Indicates whether this is a 'generate' or 'regenerate' operation (default: 'generate')

#### Returns:
- Boolean indicating if the update was successful

#### Process:
1. Calls the BriefOperations.update method with the new content and BibTeX
2. Shows a context-specific success toast based on the workflow parameter
3. Returns the success status as a boolean

## Usage

These utilities are used in two main places:

1. **Brief Generation Step**: When a user clicks "Generate Brief" in the brief creation flow
2. **Brief View Page**: When a user clicks "Regenerate Brief" on an existing brief

### Example Usage:

```typescript
// In a component
const { completeWithAI } = useLLM();

// Generate the brief
const result = await generateBrief(brief, completeWithAI);

// Update the brief with the generated content
if (result.success && result.content && result.bibtex) {
  // For initial generation
  const success = await updateBriefWithGeneratedContent(briefId, result.content, result.bibtex, 'generate');
  
  // Or for regeneration
  const success = await updateBriefWithGeneratedContent(briefId, result.content, result.bibtex, 'regenerate');
  
  if (success) {
    // Handle success (e.g., navigate or update UI)
  }
}
```

## Implementation Details

### Paper Data Retrieval

The function fetches complete paper data from the database, including:
- Title
- Authors
- Year
- Abstract
- ArXiv ID
- PDF URL

This ensures the AI has comprehensive information about each paper to generate a more accurate and detailed brief.

### AI Prompt Structure

The AI prompt consists of two parts:

1. **System Message**: Provides instructions to the AI about the task
   ```
   You are an expert academic researcher creating a literature review.
   Generate a concise, well-structured research brief in markdown format with the following elements:
   
   1. A clear, descriptive title at the top using a # heading
   2. 2-3 well-organized sections with ## headings that synthesize key findings, methodologies, and gaps
   3. Use inline citations in the format [n] and ensure all papers are cited at least once
   4. The brief should be academically rigorous but accessible
   5. Total length should be approximately half a page (2-3 paragraphs)
   
   Format the output as proper markdown with appropriate headings, paragraphs, and formatting.
   ```

2. **User Message**: Contains the research query and paper data
   ```
   Research query: [The user's research query]
   
   Papers to include:
   [JSON representation of paper data with abstracts]
   ```

### Response Logging

The function logs both:
1. The user message sent to the AI (including paper data)
2. The complete API response received from the AI

This helps with debugging and understanding the AI's output.

### BibTeX Generation

BibTeX entries are generated from the complete paper data with the following format:

```
@article{ref[index],
  title={[Paper title]},
  author={[Paper authors joined with 'and']},
  year={[Paper year]},
  url={[PDF URL if available]}
}
```

## Error Handling

Both functions include comprehensive error handling:

1. Input validation to ensure required data is present
2. Try/catch blocks to handle exceptions during AI calls or database operations
3. Fallback mechanisms if paper data cannot be retrieved
4. Error logging to console
5. User-friendly error messages via toast notifications 