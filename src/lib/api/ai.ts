import { BaseAPIClient } from './base';
import type { Paper } from '../db/schema/paper';
import type { AIRequest, AIResponse, AIProviders, AIProviderConfig } from '../services/ai/types';
import { ProviderRegistry } from '../llm/provider-registry';
import type { LLMResponse } from '../llm/types';

/**
 * AI API client
 */
export class AIAPIClient extends BaseAPIClient {
  private provider: keyof AIProviders;
  private config: AIProviderConfig;
  private providerRegistry: ProviderRegistry;

  constructor(
    provider: keyof AIProviders,
    config: AIProviderConfig,
    apiKey: string
  ) {
    super(config.endpoint);
    this.provider = provider;
    this.config = config;
    this.setHeaders(config.getHeaders(apiKey));
    
    // Initialize provider registry
    this.providerRegistry = ProviderRegistry.getInstance();
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
    
    // Determine which LLM provider to use
    // For backward compatibility, map the provider name and use our new system
    let providerName = 'openai'; // Default to OpenAI
    let modelName = request.params.model || this.config.defaultModel;
    
    // Map provider names to our provider system
    if (this.provider.toLowerCase().includes('claude') || 
        this.provider.toLowerCase().includes('anthropic')) {
      providerName = 'anthropic';
    } else if (this.provider.toLowerCase().includes('grok')) {
      providerName = 'grok';
    } else if (this.provider.toLowerCase().includes('openrouter') ||
               this.provider.toLowerCase().includes('mistral') ||
               this.provider.toLowerCase().includes('command-r') ||
               this.provider.toLowerCase().includes('cohere')) {
      providerName = 'openrouter';
      
      // For OpenRouter, we need to include the full model path if not already specified
      if (!modelName.includes('/')) {
        if (modelName.toLowerCase().includes('claude')) {
          modelName = `anthropic/${modelName}`;
        } else if (modelName.toLowerCase().includes('gpt')) {
          modelName = `openai/${modelName}`;
        } else if (modelName.toLowerCase().includes('mistral')) {
          modelName = `mistralai/${modelName}`;
        } else if (modelName.toLowerCase().includes('command')) {
          modelName = `cohere/${modelName}`;
        }
      }
    } else if (this.provider.toLowerCase().includes('gemini')) {
      providerName = 'gemini';
    }
    
    try {
      // Use our new LLM provider system
      let response: LLMResponse;
      
      // Check if provider is configured
      const llmProvider = this.providerRegistry.getProvider(providerName);
      const settings = this.providerRegistry.getProviderSettings(providerName);
      
      // If settings exists, use settings API key, otherwise use the one passed to constructor
      const apiKey = settings?.apiKey || request.params.apiKey;
      
      if (!apiKey) {
        throw new Error(`No API key available for ${providerName}`);
      }
      
      // If provider not already configured with this API key, set it up
      if (!settings || settings.apiKey !== apiKey) {
        this.providerRegistry.updateProviderSettings(providerName, {
          apiKey,
          selectedModel: modelName
        });
      }
      
      // Use our LLM system to make the request
      response = await llmProvider.chat({
        prompt,
        model: modelName,
        maxTokens: request.params.maxTokens || 4000,
        temperature: request.params.temperature || 0.7
      });
      
      // Extract content from response
      const content = response.content;
      
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
      
    } catch (error) {
      // If our new system fails, fall back to the original implementation for backward compatibility
      console.warn('Failed to use new LLM system, falling back to original implementation', error);
      
      // Create request body (original implementation)
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

      // Make API request with retry (original implementation)
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
  }

  /**
   * Generate BibTeX entries for papers
   */
  private generateBibTeX(papers: Paper[]): string {
    return papers.map(paper => paper.bibtex).join('\n\n');
  }
} 