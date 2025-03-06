export const PROVIDER_ORDER = ['openai', 'anthropic', 'grok', 'openrouter', 'gemini'] as const;

export type LLMProvider = typeof PROVIDER_ORDER[number];

export type LLMProviderMap<T> = {
  [K in LLMProvider]?: T;
}; 