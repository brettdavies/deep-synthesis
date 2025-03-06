import { useEffect, useState } from 'react';
import { ProviderRegistry } from '@/lib/llm/provider-registry';
import { SettingOperations } from '@/lib/db/operations/settings';
import type { ProviderSettings } from '@/lib/llm/types';
import { PROVIDER_ORDER } from '@/lib/llm/constants';

/**
 * Hook to initialize LLM providers with settings from the database
 * This should be used at the application root level to ensure providers
 * are properly initialized with saved settings
 */
export function useLLMInitializer() {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Only run this effect once on mount
    const initializeLLM = async () => {
      try {
        setLoading(true);
        const registry = ProviderRegistry.getInstance();
        
        // Load settings from IndexedDB
        const allSettings = await SettingOperations.getAll();
        
        // Filter for LLM provider settings
        const providerSettings = allSettings.filter(s => PROVIDER_ORDER.includes(s.provider as typeof PROVIDER_ORDER[number]));
        
        if (providerSettings.length === 0) {
          console.log('No LLM provider settings found in database');
          setInitialized(true);
          setLoading(false);
          return;
        }
        
        // Format as Record<string, ProviderSettings>
        const parsedSettings: Record<string, ProviderSettings> = {};
        providerSettings.forEach(setting => {
          parsedSettings[setting.provider] = {
            apiKey: setting.apiKey || '',
            selectedModel: setting.value?.selectedModel || '',
            options: setting.options || { models: {} }
          };
          
          console.log(`Loaded settings for ${setting.provider}`);
        });
        
        // Update provider registry with settings
        registry.updateSettings(parsedSettings);
        
        setInitialized(true);
      } catch (err) {
        console.error('Error initializing LLM providers:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    initializeLLM();
  }, []);

  return { initialized, loading, error };
} 