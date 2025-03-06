import type { ModelInfo } from '../types';

/**
 * List of approved Anthropic models that users can choose from.
 * This list is used for filtering available models returned by the API.
 */
export const ANTHROPIC_MODELS: ModelInfo[] = [
  {
    id: 'claude-3-7-sonnet-latest',
    name: 'Claude 3.7 Sonnet',
    provider: 'Anthropic',
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
    id: 'claude-3-5-sonnet-latest',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
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
    id: 'claude-3-5-haiku-latest',
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    capabilities: {
      maxTokens: 200000,
      contextWindow: 200000,
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    costPer1kTokens: {
      input: 0.0008,
      output: 0.004,
    },
    isDefault: true,
  },
  {
    id: 'claude-3-opus-latest',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
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
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
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
]; 