import { BaseLLMProvider } from '../base-provider';
import type { LLMRequest, LLMResponse, ModelInfo, ProviderConfig } from '../types';
import { ANTHROPIC_MODELS } from './anthropic-models';

const ANTHROPIC_CONFIG: ProviderConfig = {
  name: 'Anthropic',
  requiresKey: true,
  defaultModel: 'claude-3-5-haiku-latest',
  endpoints: {
    chat: 'https://api.anthropic.com/v1/messages',
  },
  models: ANTHROPIC_MODELS,
};

export class AnthropicProvider extends BaseLLMProvider {
  constructor(settings: { apiKey?: string } = {}) {
    super(ANTHROPIC_CONFIG, settings);
  }

  async listAvailableModels(): Promise<ModelInfo[]> {
    if (!this.settings.apiKey) {
      return [];
    }

    try {
      console.log('[Anthropic] Fetching available models...');
      const headers = {
        'x-api-key': this.settings.apiKey,
        'anthropic-version': '2023-01-01', // Updated to latest API version
      };

      // Use the base makeGetRequest method for consistent logging
      const response = await this.makeGetRequest(
        'https://api.anthropic.com/v1/models',
        headers
      );

      const data = await response.json();
      
      // Use the base class method to process models with a custom mapper
      return this.processModelListResponse(
        data.models, 
        'id', 
        (model: any) => ({
          capabilities: {
            maxTokens: model.max_tokens_to_sample || 4096,
            contextWindow: model.context_window || 8192,
            streaming: true,
            functionCalling: model.id.includes('claude-3') || model.id.includes('claude-3.5') || model.id.includes('claude-3.7'),
            vision: model.id.includes('claude-3') || model.id.includes('claude-3.5') || model.id.includes('claude-3.7'),
          },
          costPer1kTokens: {
            input: 0.0025, // Default pricing (will be approximate)
            output: 0.0125, // Default pricing (will be approximate)
          },
        })
      );
    } catch (error) {
      console.error('Error fetching Anthropic models:', error);
      return this.getModels(); // Fallback to configured models
    }
  }

  async validateKey(key: string): Promise<boolean> {
    try {
      console.log('[Anthropic] Validating API key...');
      
      // Due to CORS restrictions in browsers, we can't directly call the Anthropic API
      // Instead, check only key format for basic validation
      if (!key || typeof key !== 'string' || key.trim().length < 50) {
        console.error('[Anthropic] Invalid API key format');
        return false;
      }
      
      // Check if key has the expected Anthropic key prefix
      if (!key.startsWith('sk-ant-')) {
        console.error('[Anthropic] API key does not have the expected format (should start with sk-ant-)');
        return false;
      }
      
      console.log('[Anthropic] API key format appears valid');
      
      // In a browser context without a proxy, we can't fully validate the key
      // We'll assume the key is valid if the format is correct
      // A real validation will happen on the first actual API call
      return true;
    } catch (error) {
      console.error('Error validating Anthropic API key:', error);
      return false;
    }
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const response = await fetch(this.config.endpoints.chat, {
      method: 'POST',
      headers: {
        'x-api-key': this.settings.apiKey || '',
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model,
        messages: [{ role: 'user', content: request.prompt }],
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature,
        stream: request.stream,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Unknown error');
    }

    const data = await response.json();
    
    return {
      content: data.content[0].text,
      usage: {
        promptTokens: data.usage.input_tokens || 0,
        completionTokens: data.usage.output_tokens || 0,
        totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
      },
      model: data.model,
    };
  }
} 