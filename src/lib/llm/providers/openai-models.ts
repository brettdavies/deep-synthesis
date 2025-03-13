import type { ModelInfo } from '../types';

/**
 * List of approved OpenAI models that users can choose from.
 * This list is used for filtering available models returned by the API.
 */
export const OPENAI_MODELS: ModelInfo[] = [
  {
    id: 'chatgpt-4o-latest',
    name: 'GPT-4o Latest',
    provider: 'OpenAI',
    capabilities: {
      maxTokens: 128000,
      contextWindow: 128000,
      streaming: true,
      functionCalling: true,
      vision: true,
      structuredOutput: true,
      jsonMode: true,
    },
    costPer1kTokens: {
      input: 0.01,
      output: 0.03,
    },
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    capabilities: {
      maxTokens: 4096,
      contextWindow: 16384,
      streaming: true,
      functionCalling: true,
      vision: false,
      structuredOutput: false,
      jsonMode: true,
    },
    costPer1kTokens: {
      input: 0.0005,
      output: 0.0015,
    },
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    capabilities: {
      maxTokens: 8192,
      contextWindow: 8192,
      streaming: true,
      functionCalling: true,
      vision: false,
      structuredOutput: false,
      jsonMode: true,
    },
    costPer1kTokens: {
      input: 0.03,
      output: 0.06,
    },
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    capabilities: {
      maxTokens: 128000,
      contextWindow: 128000,
      streaming: true,
      functionCalling: true,
      vision: true,
      structuredOutput: false,
      jsonMode: true,
    },
    costPer1kTokens: {
      input: 0.01,
      output: 0.03,
    },
  },
  {
    id: 'gpt-4.5-preview',
    name: 'GPT-4.5 Preview',
    provider: 'OpenAI',
    capabilities: {
      maxTokens: 128000,
      contextWindow: 128000,
      streaming: true,
      functionCalling: true,
      vision: true,
      structuredOutput: true,
      jsonMode: true,
    },
    costPer1kTokens: {
      input: 0.01,
      output: 0.03,
    },
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    capabilities: {
      maxTokens: 128000,
      contextWindow: 128000,
      streaming: true,
      functionCalling: true,
      vision: true,
      structuredOutput: true,
      jsonMode: true,
    },
    costPer1kTokens: {
      input: 0.01,
      output: 0.03,
    },
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    capabilities: {
      maxTokens: 128000,
      contextWindow: 128000,
      streaming: true,
      functionCalling: true,
      vision: true,
      structuredOutput: true,
      jsonMode: true,
    },
    costPer1kTokens: {
      input: 0.00025,
      output: 0.00075,
    },
  },
  {
    id: 'o1',
    name: 'O1',
    provider: 'OpenAI',
    capabilities: {
      maxTokens: 128000,
      contextWindow: 128000,
      streaming: true,
      functionCalling: true,
      vision: true,
      structuredOutput: true,
      jsonMode: true,
    },
    costPer1kTokens: {
      input: 0.03,
      output: 0.06,
    },
  },
  {
    id: 'o1-mini',
    name: 'O1 Mini',
    provider: 'OpenAI',
    capabilities: {
      maxTokens: 128000,
      contextWindow: 128000,
      streaming: true,
      functionCalling: true,
      vision: true,
      structuredOutput: true,
      jsonMode: true,
    },
    costPer1kTokens: {
      input: 0.005,
      output: 0.015,
    },
  },
  {
    id: 'o1-preview',
    name: 'O1 Preview',
    provider: 'OpenAI',
    capabilities: {
      maxTokens: 128000,
      contextWindow: 128000,
      streaming: true,
      functionCalling: true,
      vision: true,
      structuredOutput: true,
      jsonMode: true,
    },
    costPer1kTokens: {
      input: 0.03,
      output: 0.06,
    },
  },
  {
    id: 'o3-mini',
    name: 'O3 Mini',
    provider: 'OpenAI',
    capabilities: {
      maxTokens: 128000,
      contextWindow: 128000,
      streaming: true,
      functionCalling: true,
      vision: true,
      structuredOutput: true,
      jsonMode: true,
    },
    costPer1kTokens: {
      input: 0.01,
      output: 0.03,
    },
  },
]; 