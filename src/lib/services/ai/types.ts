import type { Paper } from '../../db/schema/paper';

// Interface for AI service configuration
export interface AIServiceConfig {
  endpoint: string;
  headers: Record<string, string>;
  model?: string;
  promptTemplate?: string;
}

// Interface for AI service parameters
export interface AIServiceParams {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

// Interface for AI request
export interface AIRequest {
  query: string;
  papers: Paper[];
  params: AIServiceParams;
}

// Interface for AI response
export interface AIResponse {
  review: string;
  bibtex: string;
}

// AI service providers configuration type
export type AIProviderConfig = {
  name: string;
  endpoint: string;
  defaultModel: string;
  getHeaders: (apiKey: string) => Record<string, string>;
  getPromptTemplate: () => string;
}

// AI providers record type
export type AIProviders = Record<string, AIProviderConfig>; 