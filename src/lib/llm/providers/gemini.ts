import { BaseLLMProvider } from '../base-provider';
import type { LLMRequest, LLMResponse, ProviderConfig, ModelInfo } from '../types';
import { GEMINI_MODELS } from './gemini-models';

const GEMINI_CONFIG: ProviderConfig = {
  name: 'Gemini',
  requiresKey: true,
  defaultModel: 'gemini-1.5-flash',
  endpoints: {
    chat: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  },
  models: GEMINI_MODELS,
};

export class GeminiProvider extends BaseLLMProvider {
  constructor(settings: { apiKey?: string } = {}) {
    super(GEMINI_CONFIG, settings);
  }

  async listAvailableModels(): Promise<ModelInfo[]> {
    if (!this.settings.apiKey) {
      return [];
    }

    try {
      // Google doesn't provide a dedicated models endpoint like OpenAI
      // Instead, we'll check if the API key is valid by making a minimal request
      const isValid = await this.validateKey(this.settings.apiKey);
      
      if (!isValid) {
        return [];
      }
      
      // If the key is valid, return the configured models
      return this.getModels();
    } catch (error) {
      console.error('Error checking Gemini models:', error);
      return [];
    }
  }

  async validateKey(key: string): Promise<boolean> {
    try {
      // Make a minimal request to check if the key is valid
      const response = await fetch(this.config.endpoints.chat, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.defaultModel,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
      });

      return response.ok;
    } catch (error) {
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
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      model: data.model,
    };
  }
} 