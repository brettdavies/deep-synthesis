import { BaseLLMProvider } from '../base-provider';
import type { LLMRequest, LLMResponse, ModelInfo, ProviderConfig } from '../types';
import { OPENAI_MODELS } from './openai-models';

const OPENAI_CONFIG: ProviderConfig = {
  name: 'OpenAI',
  requiresKey: true,
  defaultModel: 'gpt-3.5-turbo',
  endpoints: {
    chat: 'https://api.openai.com/v1/chat/completions',
    completions: 'https://api.openai.com/v1/completions',
    embeddings: 'https://api.openai.com/v1/embeddings',
  },
  models: OPENAI_MODELS,
};

export class OpenAIProvider extends BaseLLMProvider {
  constructor(settings: { apiKey?: string } = {}) {
    super(OPENAI_CONFIG, settings);
  }

  async listAvailableModels(): Promise<ModelInfo[]> {
    if (!this.settings.apiKey) {
      return [];
    }

    try {
      // Use the OpenAI models endpoint to get available models
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.settings.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch OpenAI models:', await response.text());
        return this.getModels(); // Fallback to configured models
      }

      const data = await response.json();
      const availableModelIds = new Set(data.data.map((model: any) => model.id));
      
      // Only include models from our config that the API key has access to
      const availableConfigModels = this.getModels().filter(model => 
        availableModelIds.has(model.id)
      );
      
      // Return only the configured models that are available with this API key
      return availableConfigModels;
    } catch (error) {
      console.error('Error fetching OpenAI models:', error);
      return this.getModels(); // Fallback to configured models
    }
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const response = await this.makeRequest(
      this.config.endpoints.chat,
      {
        model: request.model,
        messages: [{ role: 'user', content: request.prompt }],
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        stream: request.stream,
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