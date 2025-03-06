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

    // Log the request details for debugging (without exposing full API key)
    console.log(`[${this.config.name}] Sending request to: ${endpoint}`);
    console.log(`[${this.config.name}] Request headers:`, {
      ...headers,
      'Authorization': headers['Authorization'] ? 
        `Bearer ${this.settings.apiKey?.substring(0, 4)}...${this.settings.apiKey?.substring(this.settings.apiKey.length - 4)}` : 
        undefined
    });
    console.log(`[${this.config.name}] Request body:`, JSON.stringify(body, null, 2));

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      console.log(`[${this.config.name}] Response status:`, response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.error(`[${this.config.name}] Error response:`, error);
        console.error(`[${this.config.name}] Full error details:`, JSON.stringify(error, null, 2));
        
        if (response.status === 401) {
          throw new LLMAuthError('Invalid API key');
        }
        
        // Extract the real error message if available
        const errorMessage = error.error?.message || error.message || 'Request failed';
        throw new LLMRequestError(errorMessage);
      }

      return response;
    } catch (error) {
      console.error(`[${this.config.name}] Request error:`, error);
      throw error;
    }
  }

  /**
   * Make a GET request to the specified endpoint with proper logging
   * @param endpoint The URL to make the request to
   * @param customHeaders Any additional headers to include with the request
   * @returns The fetch Response object
   */
  protected async makeGetRequest(
    endpoint: string,
    customHeaders: Record<string, string> = {}
  ): Promise<Response> {
    if (this.config.requiresKey && !this.settings.apiKey) {
      throw new LLMConfigError('API key is required but not provided');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    // Add auth header based on the provider's pattern
    if (this.settings.apiKey) {
      headers['Authorization'] = `Bearer ${this.settings.apiKey}`;
    }

    // Log the request details for debugging (without exposing full API key)
    console.log(`[${this.config.name}] Sending GET request to: ${endpoint}`);
    console.log(`[${this.config.name}] Request headers:`, {
      ...headers,
      'Authorization': headers['Authorization'] ? 
        `Bearer ${this.settings.apiKey?.substring(0, 4)}...${this.settings.apiKey?.substring(this.settings.apiKey.length - 4)}` : 
        undefined
    });

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers
      });

      console.log(`[${this.config.name}] Response status:`, response.status);
      
      if (!response.ok) {
        try {
          const error = await response.json();
          console.error(`[${this.config.name}] Error response:`, error);
          console.error(`[${this.config.name}] Full error details:`, JSON.stringify(error, null, 2));
          
          if (response.status === 401) {
            throw new LLMAuthError('Invalid API key');
          }
          
          // Extract the real error message if available
          const errorMessage = error.error?.message || error.message || 'Request failed';
          throw new LLMRequestError(errorMessage);
        } catch (jsonError) {
          // Handle case where response isn't JSON
          const errorText = await response.text();
          console.error(`[${this.config.name}] Error response (text):`, errorText);
          throw new LLMRequestError(`Request failed with status ${response.status}`);
        }
      }

      const responseData = await response.clone().json().catch(() => null);
      if (responseData) {
        console.log(`[${this.config.name}] Response data:`, JSON.stringify(responseData, null, 2));
      }

      return response;
    } catch (error) {
      console.error(`[${this.config.name}] Request error:`, error);
      throw error;
    }
  }

  // Add a helper method for validation requests that providers can use
  protected async makeValidationRequest(
    endpoint: string,
    validationBody: any,
    customHeaders: Record<string, string> = {},
    apiKey: string
  ): Promise<boolean> {
    console.log(`[${this.config.name}] Validating API key...`);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };
    
    if (apiKey) {
      // Default to Bearer token auth pattern, but only if no auth headers are provided
      // and if Authorization isn't explicitly set as empty
      if (!headers['Authorization'] && !headers['x-api-key'] && headers['Authorization'] !== '') {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      // If Authorization is explicitly set as empty string, remove it to avoid sending invalid header
      if (headers['Authorization'] === '') {
        delete headers['Authorization'];
      }
    }
    
    console.log(`[${this.config.name}] Validation request headers:`, {
      ...headers,
      'Authorization': headers['Authorization'] ? 
        headers['Authorization'].substring(0, 10) + '...' : undefined,
      'x-api-key': headers['x-api-key'] ? 
        'REDACTED' : undefined
    });
    
    console.log(`[${this.config.name}] Validation request body:`, JSON.stringify(validationBody, null, 2));
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(validationBody),
        // Add CORS mode options to handle browser security restrictions
        mode: 'cors',
        credentials: 'omit'
      });

      const responseStatus = response.status;
      console.log(`[${this.config.name}] Validation response status: ${responseStatus}`);
      
      if (!response.ok) {
        try {
          const errorJson = await response.json();
          console.error(`[${this.config.name}] Validation failed:`, errorJson);
          return false;
        } catch (e) {
          const errorText = await response.text();
          console.error(`[${this.config.name}] Validation failed (text):`, errorText);
          return false;
        }
      }
      
      console.log(`[${this.config.name}] API key validation successful`);
      return true;
    } catch (error) {
      console.error(`[${this.config.name}] Validation request error:`, error);
      return false;
    }
  }

  /**
   * Helper method for providers without a models listing API
   * Validates the API key and returns the configured models if valid
   */
  protected async getAvailableModelsWithoutListing(): Promise<ModelInfo[]> {
    if (!this.settings.apiKey) {
      return [];
    }
    
    try {
      console.log(`[${this.config.name}] Checking API key validity...`);
      const isValid = await this.validateKey(this.settings.apiKey);
      
      if (!isValid) {
        return [];
      }
      
      return this.getModels();
    } catch (error) {
      console.error(`[${this.config.name}] Error checking models:`, error);
      return [];
    }
  }

  /**
   * Helper method to standardize processing of model list responses
   * @param models Array of model objects from the provider's API
   * @param idProperty The property name that contains the model ID
   * @param modelMapper Optional function to map API model data to ModelInfo format
   * @returns Array of ModelInfo objects
   */
  protected processModelListResponse(
    models: any[], 
    idProperty: string = 'id',
    modelMapper?: (model: any) => Partial<ModelInfo>
  ): ModelInfo[] {
    const availableModelIds = new Set(models.map(model => model[idProperty]));
    
    // Filter our configured models
    const availableConfigModels = this.getModels().filter(model => 
      availableModelIds.has(model.id)
    );
    
    // Process additional models if a mapper is provided
    if (modelMapper) {
      const configModelIds = new Set(this.getModels().map(model => model.id));
      const additionalModels = models
        .filter(model => !configModelIds.has(model[idProperty]))
        .map(model => {
          const mappedModel = modelMapper(model);
          return {
            id: model[idProperty],
            name: model.name || model[idProperty],
            provider: this.config.name,
            capabilities: {
              maxTokens: 4096,
              contextWindow: 4096,
              streaming: false,
              functionCalling: false,
              vision: false,
              ...mappedModel.capabilities
            },
            costPer1kTokens: {
              input: 0.001,
              output: 0.002,
              ...mappedModel.costPer1kTokens
            },
            ...mappedModel
          };
        });
      
      return [...availableConfigModels, ...additionalModels];
    }
    
    return availableConfigModels;
  }
} 