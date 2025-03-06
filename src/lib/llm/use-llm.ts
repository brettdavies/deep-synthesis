import { useState, useEffect } from 'react';
import { ProviderRegistry } from './provider-registry';
import { SettingOperations } from '@/lib/db/operations/settings';
import type { LLMRequest, LLMResponse, ProviderSettings, ModelInfo } from './types';

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

  const completeWithAI = async (
    providerName: string,
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      reasoningEffort?: 'high' | 'medium' | 'low';
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

  const getProviders = () => {
    return registry.getAvailableProviderNames();
  };

  const getProviderModels = (providerName: string) => {
    try {
      const provider = registry.getProvider(providerName);
      return provider.getModels();
    } catch {
      return [];
    }
  };

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

  const getProviderSettings = (providerName: string) => {
    return registry.getProviderSettings(providerName);
  };

  // Get only enabled models for a provider
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
  };
} 