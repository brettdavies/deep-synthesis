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
      // OpenRouter provides a models endpoint to list available models
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.settings.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://deep-synthesis.app',
          'X-Title': 'Deep Synthesis',
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch OpenRouter models:', await response.text());
        return this.getModels(); // Fallback to configured models
      }

      const data = await response.json();
      const availableModels = data.data || [];
      
      // Map OpenRouter model data to our ModelInfo format
      const modelInfoMap = new Map<string, ModelInfo>();
      
      // First, add our configured models as a baseline
      this.getModels().forEach(model => {
        modelInfoMap.set(model.id, model);
      });
      
      // Then add/update with actual available models
      for (const model of availableModels) {
        // Skip non-chat models
        if (!model.id.includes('/')) continue;
        
        // Extract provider and model name
        const [provider, modelName] = model.id.split('/');
        const displayName = model.name || `${provider.charAt(0).toUpperCase() + provider.slice(1)} ${modelName}`;
        
        modelInfoMap.set(model.id, {
          id: model.id,
          name: displayName,
          provider: 'OpenRouter',
          capabilities: {
            maxTokens: model.context_length || 4096,
            contextWindow: model.context_length || 4096,
            streaming: model.streaming !== false,
            functionCalling: Boolean(model.supports_tools),
            vision: Boolean(model.supports_vision),
          },
          costPer1kTokens: {
            input: model.pricing?.prompt || 0.001,
            output: model.pricing?.completion || 0.002,
          },
        });
      }
      
      return Array.from(modelInfoMap.values());
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
      return this.getModels(); // Fallback to configured models
    }
  }

  async validateKey(key: string): Promise<boolean> {
    try {
      const response = await fetch(this.config.endpoints.chat, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin, // Required by OpenRouter
          'X-Title': 'Deep Synthesis', // Optional but good practice
        },
        body: JSON.stringify({
          model: this.config.defaultModel,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10
        })
      });

      if (!response.ok) {
        return false;
      }

      return true;
    } catch (error) {
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