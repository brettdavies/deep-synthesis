# Research Brief Creation - Implementation Plan

## Overview

This document outlines the implementation plan for the Research Brief Creation feature. The feature helps users refine research queries, search for relevant papers on arXiv, score them for relevance, and create comprehensive research briefs.

This is a simple CRUD app with browser-based storage using existing patterns and components.

## Workflow

1. **Query Refinement**: User + AI iteratively refine the research query
2. **Paper Discovery**: AI creates search queries and app searches for papers on arXiv
3. **Relevance Ranking**: AI ranks papers based on abstract relevance
4. **Paper Selection**: User selects papers (up to 10) for inclusion
5. **Brief Creation**: AI writes brief based on selected papers

## 1. Query Refinement Phase

The iterative dialogue should focus on helping users clarify:

- Specific sub-topics within their research area
- Research methodologies they're interested in
- Relevant academic context and terminology
- Timeframe considerations (which arXiv supports)

**AI Prompt Structure:**

```plaintext
You are a research assistant helping to refine a research query. Your goal is to help the user clarify their research interests before searching for relevant papers on arXiv.

Initial Query: {user_initial_query}

Please ask thoughtful follow-up questions to help refine this query. Focus on:
1. Clarifying specific sub-topics of interest
2. Identifying relevant methodologies
3. Establishing timeframe considerations
4. Understanding the academic context

Be conversational but focused on academic precision.
```

## 2. arXiv Integration

Following the arXiv API documentation:

- Respect the rate limit (one request every 3 seconds)
- Use HTTP GET requests to the API endpoint
- Support search parameters including dates, categories, and field-specific searches

**API Request Structure:**

```plaintext
http://export.arxiv.org/api/query?search_query={encoded_query}&start={start_index}&max_results=100
```

For search query generation, we'll use a prompt like:

```plaintext
Based on the refined research query:
"{refined_query}"

Generate {number} optimized search queries for arXiv that will help find the most relevant papers. Each query should:
1. Target a different aspect of the research question
2. Use appropriate field prefixes (ti:, au:, abs:, etc.) when applicable
3. Incorporate Boolean operators (AND, OR, ANDNOT) effectively

Format each query properly for the arXiv API.
```

### arXiv Search Parameters

Based on the arXiv API documentation, we can leverage these field prefixes:

| **prefix** | **explanation**           |
| ---------- | ------------------------- |
| ti         | Title                     |
| au         | Author                    |
| abs        | Abstract                  |
| co         | Comment                   |
| jr         | Journal Reference         |
| cat        | Subject Category          |
| rn         | Report Number             |
| all        | All of the above          |

And Boolean operators:

- AND
- OR
- ANDNOT

## 3. Relevance Scoring

**JSON Schema for Paper Scoring:**

```json
{
  "paper_id": "string",
  "title": "string",
  "authors": "string",
  "relevance_score": "integer",  // 1-100 scale
  "relevance_explanation": "string",  // Brief explanation of the score
  "key_relevance_factors": ["string"],  // List of factors making this paper relevant
  "potential_usefulness": "string"  // How this might contribute to the research
}
```

**AI Prompt for Scoring:**

```plaintext
You are evaluating the relevance of academic papers for a research brief.

User Query: "{refined_query}"

For each paper abstract below, evaluate its relevance to the query on a scale of 1-100, where:
- 1-20: Not relevant
- 21-40: Tangentially relevant
- 41-60: Moderately relevant
- 61-80: Highly relevant
- 81-100: Exceptionally relevant

Analyze factors like methodology alignment, recency, direct topic relevance, and potential usefulness.

Provide your evaluation in the specified JSON format.

Paper Abstracts:
{abstracts_json}
```

## 4. Paper Selection & Processing

This phase will leverage the existing papers system to:

- Download the selected PDFs (respecting arXiv's policies)
- Store them appropriately
- Extract content via AI for the brief creation

User interface will allow selection of up to 10 papers from the ranked list.

## 5. Brief Creation

**AI Brief Writing Prompt:**

```plaintext
You are creating a comprehensive research brief based on the following papers that were selected to answer a specific research query.

Research Query: "{refined_query}"

Your task is to synthesize the content from these papers into a cohesive brief that addresses the research query. The brief should:

1. Begin with an executive summary (250-300 words)
2. Provide relevant background information
3. Synthesize key findings and insights from all papers
4. Identify points of consensus and disagreement
5. Highlight methodology considerations
6. Discuss implications and applications
7. Include proper academic citations

Papers:
{paper_contents}

Format the brief in a scholarly style with appropriate headings, subheadings, and citations following academic best practices.
```

Output formats will include:

- PDF
- Word (docx)
- Markdown

## Technical Implementation Details

### UI/UX Implementation

- **Component Library**: Utilize existing components from Radix UI and Shadcn UI
- **Styling**: Follow existing Tailwind CSS patterns and design system
- **UI Flow**:
  - Show loading states during API calls and AI processing
  - Provide clear progress indicators for multi-step processes
  - Maintain consistency with existing app patterns
- Use existing Radix UI and Shadcn UI components
- Follow Tailwind CSS patterns already in place
- Maintain consistency with existing app patterns

### LLM Integration

- Use existing active models in the database 
- Simple dropdown selector for users to choose which model to use
- Use Dexie LiveQuery to access available models

```typescript
// Simple function to use the selected model
async function useSelectedModel(modelId, prompt, options) {
  const model = await db.activeModels.get(modelId);
  return callModelAPI(model, prompt, options);
}
```

- **No Need for Complex Architecture**: Leverage existing model access patterns rather than creating new abstractions
- 
### Data Storage

- Use existing Dexie.js database patterns
- Leverage the existing papers system for PDF storage
- Simple schema extension for new data:

```typescript
// Minimal schema for the research brief feature
db.version(currentVersion + 1).stores({
  researchQueries: '++id, query, timestamp',
  researchBriefs: '++id, queryId, content',
  paperRelevance: '++id, paperId, queryId, score'
});
```

### Error Handling

- Use existing toast system for user feedback
- Implement specific error handling for:
  - API failures (arXiv)
  - LLM response issues
  - PDF processing failures
- Provide meaningful error messages and recovery options
- Follow standard error handling patterns in the app

### Rate Limiting

- Simple delay between arXiv API calls (3+ seconds)
- Basic retry logic for failed requests

## Next Steps

1. Create UI components for query refinement using existing components
2. Implement arXiv API integration with basic rate limiting
3. Build simple relevance scoring mechanism
4. Set up paper selection interface
5. Integrate with brief creation
6. Set up Dexie tables
