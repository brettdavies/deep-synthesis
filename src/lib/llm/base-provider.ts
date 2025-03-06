import { 
  LLMConfigError,
  LLMAuthError,
  LLMRequestError
} from './types';
import type { 
  LLMProvider, 
  ProviderConfig, 
  ModelInfo, 
  LLMRequest, 
  LLMResponse
} from './types';

export abstract class BaseLLMProvider implements LLMProvider {
  protected constructor(
    public readonly config: ProviderConfig,
    protected settings: { apiKey?: string } = {}
  ) {}

  abstract chat(request: LLMRequest): Promise<LLMResponse>;

  getModels(): ModelInfo[] {
    return this.config.models;
  }

  async listAvailableModels(): Promise<ModelInfo[]> {
    const maxRetries = 3;
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        // Default implementation returns all models from config
        // Provider-specific implementations should override this
        // to check which models the API key has access to
        return await this.getModels();
      } catch (error) {
        attempts++;
        if (attempts === maxRetries) {
          return [];
        }
        // Wait briefly before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return [];
  }

  async isConfigured(): Promise<boolean> {
    if (!this.config.requiresKey) return true;
    if (!this.settings.apiKey) return false;
    try {
      return await this.validateKey(this.settings.apiKey);
    } catch {
      return false;
    }
  }

  async validateKey(key: string): Promise<boolean> {
    const maxRetries = 3;
    let attempts = 0;
    
    console.log(`[${this.config.name}] Starting API key validation`);
    console.log(`[${this.config.name}] Using endpoint: ${this.config.endpoints.chat}`);
    console.log(`[${this.config.name}] Active model: ${this.config.defaultModel}`);
    
    while (attempts < maxRetries) {
      attempts++;
      console.log(`[${this.config.name}] Validation attempt ${attempts}/${maxRetries}`);
      
      try {
        console.log(`[${this.config.name}] Making validation request...`);
        const response = await fetch(this.config.endpoints.chat, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.config.defaultModel,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1
          })
        });

        console.log(`[${this.config.name}] Response status: ${response.status}`);
        
        if (!response.ok) {
          const error = await response.json();
          console.error(`[${this.config.name}] Validation failed:`, error);
          
          if (response.status === 401) {
            console.error(`[${this.config.name}] Authentication error: Invalid API key`);
            throw new LLMAuthError(`Invalid API key (${response.status}: Unauthorized)`);
          }
          throw new LLMRequestError(error.message || 'Failed to validate API key');
        }

        console.log(`[${this.config.name}] API key validation successful`);
        return true;
      } catch (error) {
        // Don't retry authentication errors (401)
        if (error instanceof LLMAuthError) {
          console.error(`[${this.config.name}] Authentication error:`, error.message);
          throw error; // Immediately pass authentication errors to caller
        }
        
        console.error(`[${this.config.name}] Error during validation attempt ${attempts}:`, error);
        
        if (attempts === maxRetries) {
          console.error(`[${this.config.name}] Max retries reached, failing validation`);
          if (error instanceof LLMRequestError) {
            throw error;
          }
          throw new LLMConfigError('Failed to connect to provider');
        }
        
        console.log(`[${this.config.name}] Waiting before retry...`);
        // Wait briefly before retrying network errors
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return false;
  }

  protected async makeRequest(
    endpoint: string,
    body: any,
    customHeaders: Record<string, string> = {}
  ): Promise<Response> {
    if (this.config.requiresKey && !this.settings.apiKey) {
      throw new LLMConfigError('API key is required but not provided');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (this.settings.apiKey) {
      headers['Authorization'] = `Bearer ${this.settings.apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 401) {
        throw new LLMAuthError('Invalid API key');
      }
      throw new LLMRequestError(error.message || 'Request failed');
    }

    return response;
  }
} 