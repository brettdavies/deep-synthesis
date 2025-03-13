import { useState, useEffect } from 'react';
import { ProviderRegistry } from './provider-registry';
import { SettingOperations } from '@/lib/db/operations/settings';
import type { LLMRequest, LLMResponse, ProviderSettings, ModelInfo } from './types';

/**
 * Custom hook for interacting with Language Learning Models (LLMs).
 * Provides functionality for completing prompts, managing provider settings,
 * and handling model configurations.
 * 
 * @returns {Object} An object containing LLM interaction methods and state
 * @property {boolean} loading - Whether an LLM operation is in progress
 * @property {string|null} error - Error message if an operation failed
 * @property {Function} completeWithAI - Send a prompt to an LLM provider
 * @property {Function} validateApiKey - Validate an API key for a provider
 * @property {Function} saveProviderSettings - Save settings for a provider
 * @property {Function} getProviders - Get list of available providers
 * @property {Function} getProviderModels - Get models for a provider
 * @property {Function} getAvailableModels - Get available models for a provider
 * @property {Function} getProviderSettings - Get settings for a provider
 * @property {Function} getEnabledModels - Get enabled models for a provider
 */
export function useLLM() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registry = ProviderRegistry.getInstance();

  // Load settings on initial hook mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load settings from IndexedDB
        const allSettings = await SettingOperations.getAll();
        
        // Filter for LLM provider settings
        const providers = ['openai', 'anthropic', 'grok', 'openrouter', 'gemini'];
        const providerSettings = allSettings.filter(s => providers.includes(s.provider));
        
        // Format as Record<string, ProviderSettings>
        const parsedSettings: Record<string, ProviderSettings> = {};
        providerSettings.forEach(setting => {
          parsedSettings[setting.provider] = {
            apiKey: setting.apiKey || '',
            selectedModel: setting.value?.selectedModel || '',
            options: setting.options || { models: {} }
          };
        });
        
        // Ensure each provider settings has options.models structure
        Object.keys(parsedSettings).forEach(provider => {
          if (!parsedSettings[provider].options) {
            parsedSettings[provider].options = { models: {} };
          } else if (!parsedSettings[provider].options.models) {
            parsedSettings[provider].options.models = {};
          }
          
          // Log to verify keys are loaded properly
          if (parsedSettings[provider].apiKey) {
            console.log(`Found API key for ${provider}`);
          }
        });
        
        // Update provider registry with settings
        registry.updateSettings(parsedSettings);
        
        console.log('LLM settings loaded from database');
      } catch (err) {
        console.error('Error loading LLM settings:', err);
        setError('Failed to load LLM settings');
      }
    };
    
    loadSettings();
  }, []);

  /**
   * Sends a prompt to an LLM provider and returns the response.
   * Uses the provider's configured model and API key from settings.
   * 
   * @param {string} providerName - Name of the LLM provider (e.g., 'openai', 'anthropic')
   * @param {string} prompt - The prompt to send to the LLM
   * @param {Object} [options] - Optional configuration for the completion
   * @param {number} [options.temperature] - Sampling temperature (0-1)
   * @param {number} [options.maxTokens] - Maximum tokens to generate
   * @param {boolean} [options.stream] - Whether to stream the response
   * @param {'high'|'medium'|'low'} [options.reasoningEffort] - Reasoning effort for o3 models
   * @param {Object} [options.responseFormat] - Response format configuration
   * @returns {Promise<LLMResponse>} The LLM's response
   * @throws {Error} If no API key is configured or the request fails
   */
  const completeWithAI = async (
    providerName: string,
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      reasoningEffort?: 'high' | 'medium' | 'low';
      responseFormat?: {
        type: 'json_object' | 'json_schema';
        json_schema?: {
          name: string;
          strict: boolean;
          schema: Record<string, any>;
        };
      };
    }
  ): Promise<LLMResponse> => {
    setLoading(true);
    setError(null);

    try {
      const provider = registry.getProvider(providerName);
      const settings = registry.getProviderSettings(providerName);

      if (!settings?.apiKey) {
        throw new Error(`No API key configured for ${providerName}. Please add your API key in settings.`);
      }

      const request: LLMRequest = {
        prompt,
        model: settings.selectedModel,
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens,
        stream: options?.stream,
        reasoningEffort: options?.reasoningEffort,
        responseFormat: options?.responseFormat,
      };

      const response = await provider.chat(request);
      return response;
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Validates an API key for a specific provider.
   * Attempts to make a test request to verify the key works.
   * 
   * @param {string} providerName - Name of the LLM provider
   * @param {string} apiKey - API key to validate
   * @returns {Promise<boolean>} Whether the key is valid
   */
  const validateApiKey = async (
    providerName: string,
    apiKey: string
  ): Promise<boolean> => {
    console.log(`[useLLM] Starting API key validation for ${providerName}`);
    console.log(`[useLLM] API key length: ${apiKey.length} characters`);
    
    try {
      console.log(`[useLLM] Getting provider instance for ${providerName}`);
      const provider = registry.getProvider(providerName);
      
      console.log(`[useLLM] Initiating key validation for ${providerName}`);
      const result = await provider.validateKey(apiKey);
      console.log(`[useLLM] Validation result for ${providerName}:`, result);
      
      return result;
    } catch (err) {
      console.error(`[useLLM] Error during ${providerName} key validation:`, err);
      
      // Check for specific error types
      if (err instanceof Error) {
        // Authentication error (401)
        if (err.name === 'LLMAuthError' || err.message.includes('Invalid API key') || err.message.includes('401')) {
          console.error(`[useLLM] Authentication error detected for ${providerName}`);
          setError(`Invalid API key for ${providerName}: ${err.message}`);
          return false;
        }
      }
      
      setError(err instanceof Error ? err.message : `Error validating ${providerName} API key`);
      return false;
    }
  };

  /**
   * Saves provider settings to both the registry and persistent storage.
   * Ensures settings have the correct structure before saving.
   * 
   * @param {string} providerName - Name of the LLM provider
   * @param {ProviderSettings} settings - Provider settings to save
   * @returns {Promise<void>}
   */
  const saveProviderSettings = async (
    providerName: string,
    settings: ProviderSettings
  ): Promise<void> => {
    try {
      // Ensure the settings have the proper structure
      if (!settings.options) {
        settings.options = { models: {} };
      } else if (!settings.options.models) {
        settings.options.models = {};
      }
      
      // Update the registry
      registry.updateProviderSettings(providerName, settings);

      // Format for database
      const settingRecord = {
        provider: providerName,
        value: {
          selectedModel: settings.selectedModel
        },
        apiKey: settings.apiKey,
        options: settings.options
      };
      
      // Save to IndexedDB
      await SettingOperations.upsert(settingRecord);
      console.log(`Saved ${providerName} settings to database`);
    } catch (err) {
      console.error(`Error saving ${providerName} settings:`, err);
      setError(err instanceof Error ? err.message : 'Error saving settings');
    }
  };

  /**
   * Gets a list of all available provider names.
   * 
   * @returns {string[]} Array of provider names
   */
  const getProviders = () => {
    return registry.getAvailableProviderNames();
  };

  /**
   * Gets all models configured for a specific provider.
   * 
   * @param {string} providerName - Name of the LLM provider
   * @returns {ModelInfo[]} Array of model information
   */
  const getProviderModels = (providerName: string) => {
    try {
      const provider = registry.getProvider(providerName);
      return provider.getModels();
    } catch {
      return [];
    }
  };

  /**
   * Fetches available models from a provider's API.
   * Can use either configured API key or a temporary override.
   * 
   * @param {string} providerName - Name of the LLM provider
   * @param {string} [apiKeyOverride] - Optional API key to use instead of configured one
   * @returns {Promise<ModelInfo[]>} Array of available models
   */
  const getAvailableModels = async (
    providerName: string,
    apiKeyOverride?: string
  ): Promise<ModelInfo[]> => {
    try {
      const provider = registry.getProvider(providerName);
      
      // If an API key override is provided, create a temporary provider instance with it
      if (apiKeyOverride) {
        // We need to temporarily set the API key for the provider
        const tempProvider = registry.createProviderWithKey(providerName, apiKeyOverride);
        if (tempProvider) {
          return await tempProvider.listAvailableModels();
        }
      }
      
      // Otherwise use the existing provider with its configured API key
      const settings = registry.getProviderSettings(providerName);
      if (!settings?.apiKey) {
        console.log(`No API key configured for ${providerName}, skipping model fetch`);
        return [];  // Return empty array instead of throwing
      }
      
      return await provider.listAvailableModels();
    } catch (err) {
      console.error(`Failed to get models for ${providerName}:`, err);
      return [];
    }
  };

  /**
   * Gets current settings for a specific provider.
   * 
   * @param {string} providerName - Name of the LLM provider
   * @returns {ProviderSettings|undefined} Provider settings if configured
   */
  const getProviderSettings = (providerName: string) => {
    return registry.getProviderSettings(providerName);
  };

  /**
   * Gets only the enabled models for a specific provider.
   * If no models are explicitly disabled, returns all models.
   * 
   * @param {string} providerName - Name of the LLM provider
   * @returns {ModelInfo[]} Array of enabled models
   */
  const getEnabledModels = (providerName: string): ModelInfo[] => {
    const settings = registry.getProviderSettings(providerName);
    const allModels = getProviderModels(providerName);
    
    if (!settings?.options?.models) {
      return allModels; // All models enabled by default
    }
    
    return allModels.filter(model => {
      const modelSettings = settings.options!.models![model.id];
      return !modelSettings || modelSettings.enabled !== false;
    });
  };

  return {
    loading,
    error,
    completeWithAI,
    validateApiKey,
    saveProviderSettings,
    getProviders,
    getProviderModels,
    getAvailableModels,
    getProviderSettings,
    getEnabledModels,
    registry,
  };
} 