import { ArxivAPIClient } from './arxiv';
import { AIAPIClient } from './ai';
import { AI_PROVIDERS } from '../services/ai/operations';
import type { AIProviders } from '../services/ai/types';

/**
 * API client factory and manager
 */
export class APIClientFactory {
  private static instance: APIClientFactory;
  private arxivClient: ArxivAPIClient | null = null;
  private aiClients: Map<keyof AIProviders, AIAPIClient> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): APIClientFactory {
    if (!APIClientFactory.instance) {
      APIClientFactory.instance = new APIClientFactory();
    }
    return APIClientFactory.instance;
  }

  /**
   * Get arXiv API client
   */
  public getArxivClient(): ArxivAPIClient {
    if (!this.arxivClient) {
      this.arxivClient = new ArxivAPIClient();
    }
    return this.arxivClient;
  }

  /**
   * Get AI API client for specific provider
   */
  public getAIClient(provider: keyof AIProviders, apiKey: string): AIAPIClient {
    const existingClient = this.aiClients.get(provider);
    if (existingClient) {
      return existingClient;
    }

    const config = AI_PROVIDERS[provider];
    if (!config) {
      throw new Error(`Unknown AI provider: ${provider}`);
    }

    const client = new AIAPIClient(provider, config, apiKey);
    this.aiClients.set(provider, client);
    return client;
  }

  /**
   * Clear all clients (useful for testing or resetting state)
   */
  public clearClients(): void {
    this.arxivClient = null;
    this.aiClients.clear();
  }
}

// Export a default instance
export const apiClient = APIClientFactory.getInstance();

// Export client classes for testing
export { ArxivAPIClient } from './arxiv';
export { AIAPIClient } from './ai';
export { BaseAPIClient } from './base'; 