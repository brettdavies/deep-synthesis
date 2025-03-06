import { useLiveQuery } from 'dexie-react-hooks';
import toast from 'react-hot-toast';
import { SettingOperations } from '@/lib/db/operations';
import type { ProviderSettings } from '@/lib/llm/types';

/**
 * Custom hook to manage LLM settings in the database
 * Uses Dexie's liveQuery for real-time reactivity 
 */
export function useSettingOperations() {
  // Get all LLM settings from the database
  const llmSettings = useLiveQuery(
    () => SettingOperations.getLLMSettings(),
    [] // No dependencies - only reacts to database changes
  );

  /**
   * Save provider settings to database
   */
  const saveProviderSettings = async (
    provider: string,
    settings: ProviderSettings
  ): Promise<void> => {
    try {
      await SettingOperations.upsert({
        provider: provider.toLowerCase(),
        apiKey: settings.apiKey,
        value: {
          selectedModel: settings.selectedModel
        },
        options: settings.options
      });
      toast.success(`${provider} settings saved`);
    } catch (err) {
      console.error(`Error saving ${provider} settings:`, err);
      toast.error(`Failed to save ${provider} settings`);
    }
  };

  /**
   * Clear provider settings
   */
  const clearProviderSettings = async (provider: string): Promise<void> => {
    try {
      await SettingOperations.deleteByProvider(provider);
      toast.success(`${provider} settings cleared`);
    } catch (err) {
      console.error(`Error clearing ${provider} settings:`, err);
      toast.error(`Failed to clear ${provider} settings`);
    }
  };

  /**
   * Update model enabled status
   */
  const updateModelEnabled = async (
    provider: string,
    modelId: string,
    enabled: boolean
  ): Promise<void> => {
    try {
      await SettingOperations.updateModelEnabled(provider, modelId, enabled);
    } catch (err) {
      console.error(`Error updating model status:`, err);
      toast.error(`Failed to update model status`);
    }
  };

  /**
   * Set active model for provider
   */
  const setDefaultModel = async (
    provider: string,
    modelId: string
  ): Promise<void> => {
    try {
      console.log('Setting active model:', { provider, modelId });
      const success = await SettingOperations.setDefaultModel(provider, modelId);
      console.log('Set active model result:', success);
      if (success) {
        toast.success(`Set ${modelId} as active model for ${provider}`);
      } else {
        console.error('Provider settings not found:', { provider, modelId });
        toast.error(`Failed to set active model - provider settings not found`);
      }
    } catch (err) {
      console.error(`Error setting active model:`, err);
      toast.error(`Failed to set active model`);
    }
  };

  /**
   * Save provider settings with models
   */
  const saveProviderWithModels = async (
    provider: string,
    apiKey: string,
    models: Array<{ id: string; enabled: boolean }>,
    defaultModel?: string
  ): Promise<void> => {
    try {
      await SettingOperations.saveProviderWithModels(provider, apiKey, models, defaultModel);
      toast.success(`${provider} settings saved with models`);
    } catch (err) {
      console.error(`Error saving ${provider} settings with models:`, err);
      toast.error(`Failed to save ${provider} settings`);
    }
  };

  return {
    llmSettings: llmSettings || {},
    saveProviderSettings,
    clearProviderSettings,
    updateModelEnabled,
    setDefaultModel,
    saveProviderWithModels
  };
} 