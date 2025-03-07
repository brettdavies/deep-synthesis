import { BaseLLMProvider } from '../base-provider';
import type { LLMRequest, LLMResponse, ModelInfo, ProviderConfig } from '../types';
import { OPENAI_MODELS } from './openai-models';

const OPENAI_CONFIG: ProviderConfig = {
  name: 'OpenAI',
  requiresKey: true,
  defaultModel: 'o3-mini',
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
      console.log('[OpenAI] Fetching available models...');
      
      // Use the base makeGetRequest method for consistent logging
      const response = await this.makeGetRequest(
        'https://api.openai.com/v1/models',
        { 'Authorization': `Bearer ${this.settings.apiKey}` }
      );

      const data = await response.json();
      
      // Use the base class method to process models
      return this.processModelListResponse(data.data);
    } catch (error) {
      console.error('Error fetching OpenAI models:', error);
      return this.getModels(); // Fallback to configured models
    }
  }

  async validateKey(key: string): Promise<boolean> {
    try {
      console.log('[OpenAI] Validating API key...');
      
      // Basic format validation for browser context
      if (!key || typeof key !== 'string' || key.trim().length < 30) {
        console.error('[OpenAI] Invalid API key format');
        return false;
      }
      
      // Check if key has the expected OpenAI key prefix
      if (!key.startsWith('sk-')) {
        console.error('[OpenAI] API key does not have the expected format (should start with sk-)');
        return false;
      }
      
      console.log('[OpenAI] API key format appears valid');
      
      // Try to use the makeValidationRequest method, but fall back to format validation
      // if we encounter what appears to be a CORS issue
      try {
        // Create a validation request body with the updated parameters
        const validationBody = {
          model: this.config.defaultModel,
          messages: [{ role: 'user', content: 'test' }],
          max_completion_tokens: 5
        };
        
        return await this.makeValidationRequest(
          this.config.endpoints.chat,
          validationBody,
          { 'Authorization': `Bearer ${key}` },
          key
        );
      } catch (error: any) {
        // If this appears to be a CORS/network error rather than an auth error,
        // accept the key based on format validation
        if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
          console.warn('[OpenAI] Could not validate key through API (likely CORS), but format is valid');
          return true;
        }
        throw error; // Re-throw other errors
      }
    } catch (error) {
      console.error('Error validating OpenAI API key:', error);
      return false;
    }
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    // Log the model being used for debugging
    console.log(`[OpenAI] Using model: ${request.model}`);
    
    // Create the proper request payload with TypeScript typing
    const payload: {
      model: string;
      messages: Array<{role: string; content: string}>;
      temperature?: number;
      max_completion_tokens?: number;
      stream?: boolean;
      reasoning_effort?: string;
    } = {
      model: request.model,
      messages: [{ role: 'user', content: request.prompt }],
    };
    
    // Check if the model is o3-mini, which has different parameter support
    const isO3Model = request.model.includes('o3-');
    
    // Add optional parameters only if they're defined
    if (request.maxTokens) {
      payload.max_completion_tokens = request.maxTokens;
    }
    
    if (request.stream) {
      payload.stream = request.stream;
    }
    
    // Add temperature only for models that support it (not o3 models)
    if (request.temperature && !isO3Model) {
      payload.temperature = request.temperature;
    }
    
    // Add reasoning_effort parameter for o3-mini models
    // The default is "medium", but can be set to "high" or "low"
    if (isO3Model) {
      payload.reasoning_effort = request.reasoningEffort || "medium";
    }
    
    console.log(`[OpenAI] Request payload:`, JSON.stringify(payload, null, 2));
    
    const response = await this.makeRequest(
      this.config.endpoints.chat,
      payload
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