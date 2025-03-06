import type { ModelInfo } from '../types';

/**
 * List of approved Grok models that users can choose from.
 * This list is used for filtering available models returned by the API.
 */
export const GROK_MODELS: ModelInfo[] = [
  {
    id: 'grok-2-1212',
    name: 'Grok-2-1212',
    provider: 'Grok',
    capabilities: {
      maxTokens: 131072,
      contextWindow: 131072,
      streaming: true,
      functionCalling: true,
      vision: false,
    },
    costPer1kTokens: {
      input: 0.002,  // $2.00 per million tokens = $0.002 per 1k tokens
      output: 0.01,  // $10.00 per million tokens = $0.01 per 1k tokens
    },
    requestsPerSecond: 4,
    cluster: 'us-east-1',
  },
]; 