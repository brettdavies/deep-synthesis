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
    // Use the base class method for providers without a models listing API
    return this.getAvailableModelsWithoutListing();
  }

  async validateKey(key: string): Promise<boolean> {
    try {
      console.log('[Grok] Validating API key...');
      
      // Basic format validation for browser context
      if (!key || typeof key !== 'string' || key.trim().length < 30) {
        console.error('[Grok] Invalid API key format');
        return false;
      }
      
      console.log('[Grok] API key format appears valid');
      
      // Try to use the makeValidationRequest method, but fall back to format validation
      // if we encounter what appears to be a CORS issue
      try {
        return await this.makeValidationRequest(
          this.config.endpoints.chat,
          {
            model: this.config.defaultModel,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 5,
            temperature: 0.7,
          },
          { 'Authorization': `Bearer ${key}` },
          key
        );
      } catch (error: any) {
        // If this appears to be a CORS/network error rather than an auth error,
        // accept the key based on format validation
        if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
          console.warn('[Grok] Could not validate key through API (likely CORS), but format is valid');
          return true;
        }
        throw error; // Re-throw other errors
      }
    } catch (error) {
      console.error('Error validating Grok API key:', error);
      return false;
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