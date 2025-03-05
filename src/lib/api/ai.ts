import { BaseAPIClient } from './base';
import type { Paper } from '../db/schema/paper';
import type { AIRequest, AIResponse, AIProviders, AIProviderConfig } from '../services/ai/types';

/**
 * AI API client
 */
export class AIAPIClient extends BaseAPIClient {
  private provider: keyof AIProviders;
  private config: AIProviderConfig;

  constructor(
    provider: keyof AIProviders,
    config: AIProviderConfig,
    apiKey: string
  ) {
    super(config.endpoint);
    this.provider = provider;
    this.config = config;
    this.setHeaders(config.getHeaders(apiKey));
  }

  /**
   * Generate a literature review
   */
  public async generateReview(request: AIRequest): Promise<AIResponse> {
    // Format papers for prompt
    const formattedPapers = request.papers.map((paper, index) => {
      return `[${index + 1}] ${paper.title}
Authors: ${paper.authors.join(', ')}
Year: ${paper.year}
Abstract: ${paper.abstract}
`;
    }).join('\n');
    
    // Create prompt from template
    const prompt = this.config.getPromptTemplate()
      .replace('{{query}}', request.query)
      .replace('{{papers}}', formattedPapers);
    
    // Create request body
    const body = {
      model: request.params.model || this.config.defaultModel,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful research assistant that creates comprehensive literature reviews.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: request.params.maxTokens || 4000,
      temperature: request.params.temperature || 0.7
    };

    // Make API request with retry
    const response = await this.withRetry(() => 
      this.request<{
        choices: Array<{
          message: {
            content: string;
          };
        }>;
      }>('', {
        method: 'POST',
        body: JSON.stringify(body)
      })
    );

    // Extract content from response
    const content = response.choices?.[0]?.message?.content || '';
    
    // Parse review and BibTeX from content
    const reviewMatch = content.match(/# Literature Review\s+([\s\S]*?)(?=# BibTeX|$)/i);
    const bibtexMatch = content.match(/# BibTeX\s+([\s\S]*?)$/i);
    
    const review = reviewMatch ? reviewMatch[1].trim() : '';
    const bibtex = bibtexMatch ? bibtexMatch[1].trim() : '';
    
    // Generate BibTeX if not provided by AI
    const generatedBibtex = bibtex || this.generateBibTeX(request.papers);
    
    return {
      review,
      bibtex: generatedBibtex
    };
  }

  /**
   * Generate BibTeX entries for papers
   */
  private generateBibTeX(papers: Paper[]): string {
    return papers.map(paper => paper.bibtex).join('\n\n');
  }
} 