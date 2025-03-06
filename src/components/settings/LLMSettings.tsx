import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Router } from 'lucide-react';
import { useLLM } from '@/lib/llm/use-llm';
import { useSettingOperations } from '@/hooks/useSettingOperations';
import toast from 'react-hot-toast';
import type { ProviderSettings } from '@/lib/llm/types';
import type { ModelInfo } from '@/lib/llm/types';
import { ModelListSection } from './ModelListSection';
import { ProviderSettings as ProviderSettingsComponent } from './ProviderSettings';

// Import provider logos
import OpenAILogo from '@/assets/logos/openai-dark.svg';
import AnthropicLogo from '@/assets/logos/anthropic-dark.svg';
import GeminiLogo from '@/assets/logos/gemini-dark.svg';
import GrokLogo from '@/assets/logos/grok-dark.svg';

export function LLMSettings() {
  // Default empty settings for providers
  const defaultSettings: Record<string, ProviderSettings> = {
    openai: { apiKey: '', selectedModel: 'gpt-3.5-turbo', options: { models: {} } },
    anthropic: { apiKey: '', selectedModel: 'claude-3-haiku-20240307', options: { models: {} } },
    grok: { apiKey: '', selectedModel: 'grok-1', options: { models: {} } },
    openrouter: { apiKey: '', selectedModel: 'anthropic/claude-3-haiku', options: { models: {} } },
    gemini: { apiKey: '', selectedModel: 'gemini-1.5-flash', options: { models: {} } },
  };
  
  // Get LLM settings from database
  const { 
    llmSettings, 
    saveProviderWithModels,
    clearProviderSettings,
    updateModelEnabled,
    setDefaultModel 
  } = useSettingOperations();
  
  // Local UI state
  const [activeTab, setActiveTab] = useState('openai');
  const [validating, setValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState<{ message: string; isError: boolean } | null>(null);

  const {
    validateApiKey,
    getAvailableModels,
  } = useLLM();

  const handleValidateAndSave = async (provider: string, apiKey: string) => {
    console.log(`[LLMSettings] Starting validation and save process for ${provider}`);
    setValidating(true);
    setValidationMessage(null);
    
    try {
      console.log(`[LLMSettings] Validating API key for ${provider}`);
      const isValid = await validateApiKey(provider, apiKey);
      console.log(`[LLMSettings] API key validation result for ${provider}:`, isValid);
      
      if (isValid) {
        console.log(`[LLMSettings] API key valid, fetching available models for ${provider}`);
        // Fetch models with the validated key
        const newModels = await getAvailableModels(provider, apiKey);
        console.log(`[LLMSettings] Retrieved ${newModels.length} models for ${provider}`);
        
        // Only proceed if we got models back
        if (newModels.length > 0) {
          console.log(`[LLMSettings] Processing model updates for ${provider}`);
          
          // Get current settings for this provider
          const currentSettings = llmSettings[provider] || defaultSettings[provider];
          const currentModels = currentSettings.options?.models || {};
          const currentActiveModel = currentSettings.selectedModel;
          
          // Create map of new models with preserved enabled states
          const updatedModels = newModels.map(model => {
            const currentModelState = currentModels[model.id];
            return {
              id: model.id,
              // If model existed before, preserve its enabled state, otherwise enable by default
              enabled: currentModelState ? currentModelState.enabled : true
            };
          });
          
          // Check if current active model is still available
          const isActiveModelAvailable = newModels.some(model => model.id === currentActiveModel);
          let newActiveModel = currentActiveModel;
          
          if (!isActiveModelAvailable) {
            console.log(`[LLMSettings] Current active model ${currentActiveModel} no longer available`);
            // Find first enabled model in alphabetical order
            const enabledModels = updatedModels
              .filter(model => model.enabled)
              .sort((a, b) => a.id.localeCompare(b.id));
            
            if (enabledModels.length > 0) {
              newActiveModel = enabledModels[0].id;
              console.log(`[LLMSettings] Setting new active model to ${newActiveModel}`);
            } else {
              // If no enabled models, use the default model if it's enabled
              const defaultModel = defaultSettings[provider].selectedModel;
              const defaultModelEnabled = updatedModels.find(m => m.id === defaultModel)?.enabled;
              if (defaultModelEnabled) {
                newActiveModel = defaultModel;
              } else {
                // Last resort: use first model in alphabetical order
                newActiveModel = updatedModels[0].id;
              }
              console.log(`[LLMSettings] Falling back to model ${newActiveModel}`);
            }
          }
          
          console.log(`[LLMSettings] Saving settings for ${provider} with ${updatedModels.length} models`);
          // Save settings with updated models
          await saveProviderWithModels(
            provider,
            apiKey,
            updatedModels,
            newActiveModel
          );
          
          console.log(`[LLMSettings] Settings saved successfully for ${provider}`);
          toast.success(`${provider} API key validated successfully`);
          setValidationMessage({
            message: 'API key validated and settings saved successfully',
            isError: false,
          });
        } else {
          console.error(`[LLMSettings] No models retrieved for ${provider}`);
          toast.error(`Could not fetch available models for ${provider}`);
          setValidationMessage({
            message: 'Could not fetch available models. Please try again.',
            isError: true,
          });
        }
      } else {
        console.error(`[LLMSettings] Invalid API key for ${provider}`);
        toast.error(`Invalid ${provider} API key. Authentication failed.`);
        setValidationMessage({
          message: 'Invalid API key, please check and try again',
          isError: true,
        });
      }
    } catch (error) {
      console.error(`[LLMSettings] Error during validation process for ${provider}:`, error);
      
      // Check for authentication errors (401)
      if (error instanceof Error) {
        const errorMessage = error.message;
        if (errorMessage.includes('401') || 
            errorMessage.toLowerCase().includes('unauthorized') || 
            errorMessage.toLowerCase().includes('invalid api key')) {
          console.error(`[LLMSettings] Authentication error for ${provider}:`, errorMessage);
          toast.error(`Authentication failed: Invalid ${provider} API key`);
          setValidationMessage({
            message: `Invalid ${provider} API key. Please check your key and try again.`,
            isError: true,
          });
        } else {
          console.error(`[LLMSettings] General error for ${provider}:`, errorMessage);
          toast.error(`Error validating ${provider} API key`);
          setValidationMessage({
            message: `Error validating key: ${errorMessage}`,
            isError: true,
          });
        }
      } else {
        console.error(`[LLMSettings] Unexpected error for ${provider}:`, error);
        toast.error(`Unexpected error with ${provider} API key`);
        setValidationMessage({
          message: 'An unexpected error occurred while validating the API key',
          isError: true,
        });
      }
    } finally {
      console.log(`[LLMSettings] Validation process completed for ${provider}`);
      setValidating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Model selection section */}
      <ModelListSection 
        availableModels={Object.entries(llmSettings)
          .flatMap(([provider, settings]) => 
            Object.keys(settings.options?.models || {})
              .map(modelId => ({ 
                id: modelId,
                name: modelId,
                provider: provider.toLowerCase(),
                enabled: settings.options?.models?.[modelId]?.enabled ?? true,
                isDefault: settings.selectedModel === modelId,
                capabilities: {
                  maxTokens: 4096,
                  contextWindow: 4096,
                  streaming: true,
                  functionCalling: false,
                  vision: false
                },
                costPer1kTokens: {
                  input: 0,
                  output: 0
                }
              }))
          )} 
        settings={llmSettings}
        updateModelEnabled={(modelId, enabled, provider) => updateModelEnabled(provider, modelId, enabled)}
        onSetDefaultModel={setDefaultModel}
      />
      
      {/* Provider settings section */}
      <Card className="border shadow-sm w-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-xl">
            <Settings className="mr-2 h-5 w-5 text-primary" />
            Provider Settings
          </CardTitle>
          <CardDescription>
            Configure your AI provider API keys and active models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5">
              <TabsTrigger value="openai" className="flex items-center justify-center gap-1">
                <img src={OpenAILogo} className="h-4 w-4" alt="OpenAI logo" />
                <span>OpenAI</span>
              </TabsTrigger>
              <TabsTrigger value="anthropic" className="flex items-center justify-center gap-1">
                <img src={AnthropicLogo} className="h-4 w-4" alt="Anthropic logo" />
                <span>Anthropic</span>
              </TabsTrigger>
              <TabsTrigger value="grok" className="flex items-center justify-center gap-1">
                <img src={GrokLogo} className="h-4 w-4" alt="Grok logo" />
                <span>Grok</span>
              </TabsTrigger>
              <TabsTrigger value="openrouter" className="flex items-center justify-center gap-1">
                <Router className="h-4 w-4" />
                <span>OpenRouter</span>
              </TabsTrigger>
              <TabsTrigger value="gemini" className="flex items-center justify-center gap-1">
                <img src={GeminiLogo} className="h-4 w-4" alt="Gemini logo" />
                <span>Gemini</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="openai" className="mt-4">
              <ProviderSettingsComponent
                provider="openai"
                providerIcon={<img src={OpenAILogo} className="h-5 w-5 mr-2" alt="OpenAI logo" />}
                settings={llmSettings.openai || defaultSettings.openai}
                onVerify={(apiKey) => handleValidateAndSave('openai', apiKey)}
                onDeleteKey={() => clearProviderSettings('openai')}
                onUpdateSetting={(key, value) => {
                  if (key !== 'apiKey') {
                    saveProviderWithModels(
                      'openai',
                      llmSettings.openai.apiKey,
                      Object.entries(llmSettings.openai.options.models).map(([id, { enabled }]) => ({ id, enabled })),
                      value
                    );
                  }
                }}
                showBaseUrl={true}
                isValidating={validating}
                hideDefaultModel={true}
              />
            </TabsContent>
            
            <TabsContent value="anthropic" className="mt-4">
              <ProviderSettingsComponent
                provider="anthropic"
                providerIcon={<img src={AnthropicLogo} className="h-5 w-5 mr-2" alt="Anthropic logo" />}
                settings={llmSettings.anthropic || defaultSettings.anthropic}
                onVerify={(apiKey) => handleValidateAndSave('anthropic', apiKey)}
                onDeleteKey={() => clearProviderSettings('anthropic')}
                onUpdateSetting={(key, value) => {
                  if (key !== 'apiKey') {
                    saveProviderWithModels(
                      'anthropic',
                      llmSettings.anthropic.apiKey,
                      Object.entries(llmSettings.anthropic.options.models).map(([id, { enabled }]) => ({ id, enabled })),
                      value
                    );
                  }
                }}
                isValidating={validating}
                hideDefaultModel={true}
              />
            </TabsContent>
            
            <TabsContent value="grok" className="mt-4">
              <ProviderSettingsComponent
                provider="grok"
                providerIcon={<img src={GrokLogo} className="h-5 w-5 mr-2" alt="Grok logo" />}
                settings={llmSettings.grok || defaultSettings.grok}
                onVerify={(apiKey) => handleValidateAndSave('grok', apiKey)}
                onDeleteKey={() => clearProviderSettings('grok')}
                onUpdateSetting={(key, value) => {
                  if (key !== 'apiKey') {
                    saveProviderWithModels(
                      'grok',
                      llmSettings.grok.apiKey,
                      Object.entries(llmSettings.grok.options.models).map(([id, { enabled }]) => ({ id, enabled })),
                      value
                    );
                  }
                }}
                isValidating={validating}
                hideDefaultModel={true}
              />
            </TabsContent>
            
            <TabsContent value="openrouter" className="mt-4">
              <ProviderSettingsComponent
                provider="openrouter"
                providerIcon={<Router className="h-5 w-5 mr-2" />}
                settings={llmSettings.openrouter || defaultSettings.openrouter}
                onVerify={(apiKey) => handleValidateAndSave('openrouter', apiKey)}
                onDeleteKey={() => clearProviderSettings('openrouter')}
                onUpdateSetting={(key, value) => {
                  if (key !== 'apiKey') {
                    saveProviderWithModels(
                      'openrouter',
                      llmSettings.openrouter.apiKey,
                      Object.entries(llmSettings.openrouter.options.models).map(([id, { enabled }]) => ({ id, enabled })),
                      value
                    );
                  }
                }}
                isValidating={validating}
                hideDefaultModel={true}
              />
            </TabsContent>
            
            <TabsContent value="gemini" className="mt-4">
              <ProviderSettingsComponent
                provider="gemini"
                providerIcon={<img src={GeminiLogo} className="h-5 w-5 mr-2" alt="Gemini logo" />}
                settings={llmSettings.gemini || defaultSettings.gemini}
                onVerify={(apiKey) => handleValidateAndSave('gemini', apiKey)}
                onDeleteKey={() => clearProviderSettings('gemini')}
                onUpdateSetting={(key, value) => {
                  if (key !== 'apiKey') {
                    saveProviderWithModels(
                      'gemini',
                      llmSettings.gemini.apiKey,
                      Object.entries(llmSettings.gemini.options.models).map(([id, { enabled }]) => ({ id, enabled })),
                      value
                    );
                  }
                }}
                isValidating={validating}
                hideDefaultModel={true}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {validationMessage && (
        <Alert variant={validationMessage.isError ? 'destructive' : 'default'}>
          <AlertDescription>
            {validationMessage.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 
