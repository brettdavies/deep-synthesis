import type { ModelInfo } from '../types';

/**
 * List of approved OpenRouter models that users can choose from.
 * This list is used for filtering available models returned by the API.
 */
export const OPENROUTER_MODELS: ModelInfo[] = [
  // Anthropic models
  {
    id: 'anthropic/claude-3-opus',
    name: 'Claude 3 Opus (OpenRouter)',
    provider: 'OpenRouter',
    capabilities: {
      maxTokens: 200000,
      contextWindow: 200000,
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    costPer1kTokens: {
      input: 0.015,
      output: 0.075,
    },
  },
  {
    id: 'anthropic/claude-3-sonnet',
    name: 'Claude 3 Sonnet (OpenRouter)',
    provider: 'OpenRouter',
    capabilities: {
      maxTokens: 200000,
      contextWindow: 200000,
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    costPer1kTokens: {
      input: 0.003,
      output: 0.015,
    },
  },
  {
    id: 'anthropic/claude-3-haiku',
    name: 'Claude 3 Haiku (OpenRouter)',
    provider: 'OpenRouter',
    capabilities: {
      maxTokens: 200000,
      contextWindow: 200000,
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    costPer1kTokens: {
      input: 0.00025,
      output: 0.00125,
    },
  },
  // OpenAI models
  {
    id: 'openai/gpt-4-turbo',
    name: 'GPT-4 Turbo (OpenRouter)',
    provider: 'OpenRouter',
    capabilities: {
      maxTokens: 128000,
      contextWindow: 128000,
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    costPer1kTokens: {
      input: 0.01,
      output: 0.03,
    },
  },
  // Mistral models
  {
    id: 'mistralai/mistral-large',
    name: 'Mistral Large (OpenRouter)',
    provider: 'OpenRouter',
    capabilities: {
      maxTokens: 32000,
      contextWindow: 32000,
      streaming: true,
      functionCalling: true,
      vision: false,
    },
    costPer1kTokens: {
      input: 0.0027,
      output: 0.0081,
    },
  },
  {
    id: 'mistralai/mistral-medium',
    name: 'Mistral Medium (OpenRouter)',
    provider: 'OpenRouter',
    capabilities: {
      maxTokens: 32000,
      contextWindow: 32000,
      streaming: true,
      functionCalling: true,
      vision: false,
    },
    costPer1kTokens: {
      input: 0.0006,
      output: 0.0018,
    },
  },
  // Cohere models
  {
    id: 'cohere/command-r',
    name: 'Cohere Command-R (OpenRouter)',
    provider: 'OpenRouter',
    capabilities: {
      maxTokens: 128000,
      contextWindow: 128000,
      streaming: true,
      functionCalling: true,
      vision: false,
    },
    costPer1kTokens: {
      input: 0.0005,
      output: 0.0015,
    },
  },
]; 