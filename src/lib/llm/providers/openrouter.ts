import { BaseLLMProvider } from '../base-provider';
import type { LLMRequest, LLMResponse, ProviderConfig, ModelInfo } from '../types';
import { OPENROUTER_MODELS } from './openrouter-models';

const OPENROUTER_CONFIG: ProviderConfig = {
  name: 'OpenRouter',
  requiresKey: true,
  defaultModel: 'anthropic/claude-3-opus',
  endpoints: {
    chat: 'https://openrouter.ai/api/v1/chat/completions',
  },
  models: OPENROUTER_MODELS,
};

export class OpenRouterProvider extends BaseLLMProvider {
  constructor(settings: { apiKey?: string } = {}) {
    super(OPENROUTER_CONFIG, settings);
  }

  async listAvailableModels(): Promise<ModelInfo[]> {
    if (!this.settings.apiKey) {
      return [];
    }

    try {
      console.log('[OpenRouter] Fetching available models...');
      
      // Use the base makeGetRequest method for consistent logging
      const response = await this.makeGetRequest(
        'https://openrouter.ai/api/v1/models',
        { 'Authorization': `Bearer ${this.settings.apiKey}` }
      );
      
      const data = await response.json();
      
      // Use the base class method to process models with a custom mapper
      return this.processModelListResponse(
        data.data, 
        'id', 
        (model: any) => ({
          capabilities: {
            maxTokens: model.context_length || 4096,
            contextWindow: model.context_length || 4096,
            streaming: true,
            functionCalling: model.features?.includes('tools') || model.features?.includes('json'),
            vision: model.features?.includes('vision'),
          },
          costPer1kTokens: {
            input: model.pricing?.input || 0.0005,
            output: model.pricing?.output || 0.0015,
          },
        })
      );
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
      return this.getModels(); // Fallback to configured models
    }
  }

  async validateKey(key: string): Promise<boolean> {
    try {
      console.log('[OpenRouter] Validating API key...');
      
      // Basic format validation for browser context
      if (!key || typeof key !== 'string' || key.trim().length < 30) {
        console.error('[OpenRouter] Invalid API key format');
        return false;
      }
      
      console.log('[OpenRouter] API key format appears valid');
      
      // Try to use the makeValidationRequest method, but fall back to format validation
      // if we encounter what appears to be a CORS issue
      try {
        return await this.makeValidationRequest(
          this.config.endpoints.chat,
          {
            model: this.config.defaultModel,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 5,
          },
          { 'Authorization': `Bearer ${key}` },
          key
        );
      } catch (error: any) {
        // If this appears to be a CORS/network error rather than an auth error,
        // accept the key based on format validation
        if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
          console.warn('[OpenRouter] Could not validate key through API (likely CORS), but format is valid');
          return true;
        }
        throw error; // Re-throw other errors
      }
    } catch (error) {
      console.error('Error validating OpenRouter API key:', error);
      return false;
    }
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const customHeaders = {
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Deep Synthesis',
    };

    const response = await this.makeRequest(
      this.config.endpoints.chat,
      {
        model: request.model,
        messages: [{ role: 'user', content: request.prompt }],
        max_tokens: request.maxTokens || 4000,
        temperature: request.temperature || 0.7,
        stream: request.stream || false,
      },
      customHeaders
    );

    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      model: data.model,
    };
  }
} 