/**
 * Base types and interfaces for the LLM provider system
 */

export type ModelCapabilities = {
  maxTokens: number;
  contextWindow: number;
  streaming: boolean;
  functionCalling: boolean;
  vision: boolean;
};

export type ModelInfo = {
  id: string;
  name: string;
  provider: string;
  isDefault?: boolean;
  capabilities: ModelCapabilities;
  costPer1kTokens: {
    input: number;
    output: number;
  };
  requestsPerSecond?: number;
  cluster?: string;
};

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface LLMRequest {
  prompt: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ProviderConfig {
  name: string;
  requiresKey: boolean;
  defaultModel: string;
  models: ModelInfo[];
  endpoints: {
    chat: string;
    completions?: string;
    embeddings?: string;
  };
}

export interface LLMProvider {
  config: ProviderConfig;
  isConfigured(): Promise<boolean>;
  validateKey(key: string): Promise<boolean>;
  chat(request: LLMRequest): Promise<LLMResponse>;
  getModels(): ModelInfo[];
  listAvailableModels(): Promise<ModelInfo[]>;
}

export interface ModelSettings {
  enabled: boolean;
}

export interface ProviderSettings {
  apiKey?: string;
  selectedModel: string;
  customEndpoint?: string;
  organizationId?: string;
  options?: {
    baseUrl?: string;
    models?: Record<string, ModelSettings>;
    [key: string]: any;
  };
}

// Error types for better error handling
export class LLMConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMConfigError';
  }
}

export class LLMAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMAuthError';
  }
}

export class LLMRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMRequestError';
  }
} 