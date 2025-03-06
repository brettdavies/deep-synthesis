import { BaseLLMProvider } from '../base-provider';
import type { LLMRequest, LLMResponse, ModelInfo, ProviderConfig } from '../types';
import { ANTHROPIC_MODELS } from './anthropic-models';

const ANTHROPIC_CONFIG: ProviderConfig = {
  name: 'Anthropic',
  requiresKey: true,
  defaultModel: 'claude-3-haiku-20240307',
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
      // Anthropic provides a models endpoint to list available models
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': this.settings.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch Anthropic models:', await response.text());
        return this.getModels(); // Fallback to configured models
      }

      const data = await response.json();
      const availableModelIds = new Set(data.models.map((model: any) => model.id));
      
      // Filter our config models to only include those the API key has access to
      const availableConfigModels = this.getModels().filter(model => 
        availableModelIds.has(model.id)
      );
      
      // Add any models from the API that aren't in our config
      const configModelIds = new Set(this.getModels().map(model => model.id));
      const additionalModels = data.models
        .filter((model: any) => !configModelIds.has(model.id) && model.id.includes('claude'))
        .map((model: any) => ({
          id: model.id,
          name: model.name || model.id.replace(/-/g, ' ').replace(/(\w)(\w*)/g, (_, first, rest) => 
            first.toUpperCase() + rest
          ),
          provider: 'Anthropic',
          capabilities: {
            maxTokens: model.max_tokens || 100000,
            contextWindow: model.context_window || 100000,
            streaming: true,
            functionCalling: model.id.includes('claude-3'),
            vision: model.id.includes('claude-3'),
          },
          costPer1kTokens: {
            // Use default pricing based on model tier
            input: model.id.includes('opus') ? 0.015 : 
                  model.id.includes('sonnet') ? 0.003 : 0.00025,
            output: model.id.includes('opus') ? 0.075 : 
                   model.id.includes('sonnet') ? 0.015 : 0.00125,
          },
        }));
      
      return [...availableConfigModels, ...additionalModels];
    } catch (error) {
      console.error('Error fetching Anthropic models:', error);
      return this.getModels(); // Fallback to configured models
    }
  }

  async validateKey(key: string): Promise<boolean> {
    try {
      const response = await fetch(this.config.endpoints.chat, {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.defaultModel,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10,
        }),
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