import type { ModelInfo } from '../types';

/**
 * List of approved Gemini models that users can choose from.
 * This list is used for filtering available models returned by the API.
 */
export const GEMINI_MODELS: ModelInfo[] = [
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'Gemini',
    capabilities: {
      maxTokens: 8192,
      contextWindow: 1000000,
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    costPer1kTokens: {
      input: 0.0001,
      output: 0.0003,
    },
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Gemini',
    capabilities: {
      maxTokens: 8192,
      contextWindow: 1000000,
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    costPer1kTokens: {
      input: 0.0005,
      output: 0.0015,
    },
  },
  {
    id: 'gemini-1.0-pro',
    name: 'Gemini 1.0 Pro',
    provider: 'Gemini',
    capabilities: {
      maxTokens: 8192,
      contextWindow: 32000,
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    costPer1kTokens: {
      input: 0.00025,
      output: 0.0005,
    },
  }
]; 