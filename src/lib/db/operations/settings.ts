import db from '@/lib/db';
import type { Setting } from '@/lib/db/schema/setting';
import type { ProviderSettings } from '@/lib/llm/types';

/**
 * Settings database operations
 */
export const SettingOperations = {
  /**
   * Get all settings from the database
   */
  getAll: () => {
    return db.settings.toArray();
  },

  /**
   * Get settings for a specific provider
   */
  getByProvider: (provider: string) => {
    return db.settings
      .where('provider')
      .equalsIgnoreCase(provider)
      .first();
  },

  /**
   * Get all LLM provider settings
   */
  getLLMSettings: () => {
    const providers = ['openai', 'anthropic', 'grok', 'openrouter', 'gemini'];
    return db.settings
      .where('provider')
      .anyOfIgnoreCase(providers)
      .toArray()
      .then(settings => {
        // Format as Record<string, ProviderSettings>
        const formatted: Record<string, ProviderSettings> = {};
        settings.forEach(setting => {
          formatted[setting.provider.toLowerCase()] = {
            apiKey: setting.apiKey || '',
            selectedModel: setting.value?.selectedModel || '',
            options: setting.options || { models: {} }
          };
        });
        return formatted;
      });
  },

  /**
   * Save or update provider settings
   */
  upsert: async (setting: Omit<Setting, 'id' | 'createdAt' | 'updatedAt'>) => {
    const existing = await db.settings
      .where('provider')
      .equalsIgnoreCase(setting.provider)
      .first();

    if (existing) {
      return db.settings.update(existing.id, {
        ...setting,
        updatedAt: new Date()
      });
    } else {
      return db.settings.add({
        ...setting,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  },

  /**
   * Delete a setting by ID
   */
  delete: (id: number) => {
    return db.settings.delete(id);
  },

  /**
   * Delete settings for a provider
   */
  deleteByProvider: async (provider: string) => {
    const setting = await db.settings
      .where('provider')
      .equalsIgnoreCase(provider)
      .first();
    
    if (setting) {
      return db.settings.delete(setting.id);
    }
  },

  /**
   * Update model enabled status
   */
  updateModelEnabled: async (provider: string, modelId: string, enabled: boolean) => {
    const setting = await db.settings
      .where('provider')
      .equalsIgnoreCase(provider)
      .first();

    if (setting) {
      const options = setting.options || { models: {} };
      options.models = options.models || {};
      options.models[modelId] = { enabled };

      return db.settings.update(setting.id, {
        options,
        updatedAt: new Date()
      });
    }
  },

  /**
   * Set active model for provider
   */
  setDefaultModel: async (provider: string, modelId: string) => {
    // Normalize provider name to lowercase for consistency
    const normalizedProvider = provider.toLowerCase();
    console.log('Looking up provider settings:', { normalizedProvider, modelId });
    
    const setting = await db.settings
      .where('provider')
      .equalsIgnoreCase(normalizedProvider)
      .first();

    console.log('Found setting:', setting);

    if (setting && setting.id) {
      const updatedValue = {
        ...setting.value,
        selectedModel: modelId
      };

      // Ensure options and models are preserved
      const updatedOptions = {
        ...setting.options,
        models: {
          ...(setting.options?.models || {})
        }
      };
      
      console.log('Updating with:', { id: setting.id, updatedValue, updatedOptions });
      
      try {
        await db.settings.update(setting.id, {
          value: updatedValue,
          options: updatedOptions,
          updatedAt: new Date()
        });
        
        return true;
      } catch (error) {
        console.error('Error updating setting:', error);
        return false;
      }
    }
    return false;
  },

  /**
   * Save provider settings with models
   */
  saveProviderWithModels: async (
    provider: string,
    apiKey: string,
    models: Array<{ id: string; enabled: boolean }>,
    defaultModel?: string
  ) => {
    const modelsMap: Record<string, { enabled: boolean }> = {};
    models.forEach(model => {
      modelsMap[model.id] = { enabled: model.enabled };
    });

    const settingData: Omit<Setting, 'id' | 'createdAt' | 'updatedAt'> = {
      provider: provider.toLowerCase(),
      apiKey,
      value: {
        selectedModel: defaultModel || models[0]?.id
      },
      options: {
        models: modelsMap
      }
    };

    return SettingOperations.upsert(settingData);
  }
}; 