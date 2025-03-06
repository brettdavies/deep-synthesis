import type { Paper } from '../../db/schema/paper';
import type { AIRequest, AIResponse, AIProviders } from './types';
import { apiClient } from '../../api';

// AI service providers
export const AI_PROVIDERS: AIProviders = {
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-3.5-turbo',
    getHeaders: (apiKey: string) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }),
    getPromptTemplate: () => `
      You are a research assistant tasked with creating a comprehensive literature review based on the following papers.
      
      Research Query: {{query}}
      
      Papers:
      {{papers}}
      
      Please provide:
      1. A well-structured literature review (800-1200 words) that synthesizes the key findings, methodologies, and conclusions from these papers.
      2. Identify common themes, contradictions, and research gaps.
      3. Use citation keys [1], [2], etc. to reference specific papers.
      
      Format your response as:
      
      # Literature Review
      
      [Your review text with citations]
      
      # BibTeX
      
      [BibTeX entries for all papers]
    `
  },
  openrouter: {
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'anthropic/claude-3-opus',
    getHeaders: (apiKey: string) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Research Brief Generator'
    }),
    getPromptTemplate: () => `
      You are a research assistant tasked with creating a comprehensive literature review based on the following papers.
      
      Research Query: {{query}}
      
      Papers:
      {{papers}}
      
      Please provide:
      1. A well-structured literature review (800-1200 words) that synthesizes the key findings, methodologies, and conclusions from these papers.
      2. Identify common themes, contradictions, and research gaps.
      3. Use citation keys [1], [2], etc. to reference specific papers.
      
      Format your response as:
      
      # Literature Review
      
      [Your review text with citations]
      
      # BibTeX
      
      [BibTeX entries for all papers]
    `
  }
};

/**
 * Generate a literature review using an AI service
 * @param request AI request parameters
 * @param provider AI provider (default: 'openai')
 * @returns Promise with AI response
 */
export async function generateReview(
  request: AIRequest,
  provider: keyof typeof AI_PROVIDERS = 'openai'
): Promise<AIResponse> {
  try {
    const aiClient = apiClient.getAIClient(provider, request.params.apiKey);
    return await aiClient.generateReview(request);
  } catch (error) {
    console.error('Error generating review:', error);
    throw error;
  }
}

/**
 * Generate BibTeX entries for papers
 * @param papers Array of papers
 * @returns BibTeX string
 */
export function generateBibTeX(papers: Paper[]): string {
  return papers.map((paper, index) => {
    // Create citation key
    const firstAuthor = paper.authors[0] || 'Unknown';
    const lastName = firstAuthor.split(' ').pop() || 'Unknown';
    const citationKey = `${lastName.toLowerCase()}${paper.year}${index + 1}`;
    
    // Format authors for BibTeX
    const authors = paper.authors.join(' and ');
    
    // Create BibTeX entry
    return `@article{${citationKey},
  title = {${paper.title}},
  author = {${authors}},
  year = {${paper.year}},
  url = {${paper.abstractUrl}},
  abstract = {${paper.abstract.replace(/\n/g, ' ')}}
}`;
  }).join('\n\n');
}

/**
 * Get available AI providers
 * @returns Array of provider names and display names
 */
export function getAvailableProviders(): Array<{ id: string; name: string }> {
  return Object.entries(AI_PROVIDERS).map(([id, config]) => ({
    id,
    name: config.name
  }));
} 