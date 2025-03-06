import { BaseLLMProvider } from '../base-provider';
import type { LLMRequest, LLMResponse, ProviderConfig, ModelInfo } from '../types';
import { GROK_MODELS } from './grok-models';

const GROK_CONFIG: ProviderConfig = {
  name: 'Grok',
  requiresKey: true,
  defaultModel: 'grok-2-1212',
  endpoints: {
    chat: 'https://api.x.ai/v1/chat/completions',
  },
  models: GROK_MODELS,
};

export class GrokProvider extends BaseLLMProvider {
  constructor(settings: { apiKey?: string } = {}) {
    super(GROK_CONFIG, settings);
  }

  async listAvailableModels(): Promise<ModelInfo[]> {
    if (!this.settings.apiKey) {
      return [];
    }

    try {
      // Grok doesn't provide a dedicated models API endpoint
      // Instead, we'll check if the API key is valid and return our configured models
      const isValid = await this.validateKey(this.settings.apiKey);
      
      if (!isValid) {
        return [];
      }
      
      // If key is valid, return the configured models
      return this.getModels();
    } catch (error) {
      console.error('Error checking Grok models:', error);
      return [];
    }
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const response = await this.makeRequest(
      this.config.endpoints.chat,
      {
        model: request.model,
        messages: [{ role: 'user', content: request.prompt }],
        max_tokens: request.maxTokens || 4000,
        temperature: request.temperature || 0.7,
        stream: request.stream || false,
      }
    );

    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      model: data.model,
    };
  }
} 