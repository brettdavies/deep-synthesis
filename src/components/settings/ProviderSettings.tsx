import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyRound, ChevronRight, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { ModelInfo, ProviderSettings as ProviderSettingsType } from '@/lib/llm/types';
import type { ReactNode } from 'react';

export interface ProviderSettingsProps {
  provider: string;
  providerIcon: React.ReactNode;
  settings: ProviderSettingsType;
  availableModels?: ModelInfo[];
  isFetchingModels?: boolean;
  onVerify: (apiKey: string) => void;
  onDeleteKey: () => void;
  onUpdateSetting: (key: string, value: any) => void;
  showBaseUrl?: boolean;
  isValidating: boolean;
  hideDefaultModel?: boolean;
}

export function ProviderSettings({
  provider,
  providerIcon,
  settings,
  availableModels = [],
  isFetchingModels = false,
  onVerify,
  onDeleteKey,
  onUpdateSetting,
  showBaseUrl = false,
  isValidating,
  hideDefaultModel = false
}: ProviderSettingsProps) {
  const [isBaseUrlOpen, setIsBaseUrlOpen] = useState(false);
  const [localApiKey, setLocalApiKey] = useState(settings.apiKey || '');

  // Keep localApiKey in sync with settings
  useEffect(() => {
    setLocalApiKey(settings.apiKey || '');
  }, [settings.apiKey]);

  const getApiKeyPlaceholder = (provider: string): string => {
    switch (provider.toLowerCase()) {
      case 'openai': return 'sk-...';
      case 'anthropic': return 'sk-ant-...';
      case 'grok': return 'grok-...';
      case 'openrouter': return 'sk-or-...';
      case 'gemini': return 'AIza...';
      default: return 'Your API Key';
    }
  };

  const getProviderDescription = (provider: string): string => {
    switch (provider.toLowerCase()) {
      case 'openai':
        return 'Configure OpenAI API settings for access to GPT models. Requires an API key from OpenAI Platform.';
      case 'anthropic':
        return 'Configure Anthropic API settings for access to Claude models. Requires an API key from Anthropic Console.';
      case 'gemini':
        return 'Configure Google AI API settings for access to Gemini models. Requires an API key from Google AI Studio.';
      case 'grok':
        return 'Configure xAI API settings for access to Grok models. Requires an API key from xAI Console.';
      case 'openrouter':
        return 'Configure OpenRouter settings for access to multiple AI models through a single API. Requires an API key from OpenRouter.';
      default:
        return 'Configure provider settings and API key.';
    }
  };

  // Get enabled models from options.models
  const enabledModels = availableModels.filter(model => {
    // If not in options.models, or enabled is not explicitly false, consider it enabled
    return !settings.options?.models?.[model.id] || settings.options.models[model.id].enabled !== false;
  });

  return (
    <Card className="border shadow-sm w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-xl">
          {providerIcon || <KeyRound className="mr-2 h-5 w-5 text-primary" />}
          {provider.charAt(0).toUpperCase() + provider.slice(1)} Settings
        </CardTitle>
        <CardDescription>
          {getProviderDescription(provider)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${provider}-api-key`} className="flex items-center">
            {providerIcon}
            API Key
          </Label>
          <div className="flex space-x-2">
            <Input
              id={`${provider}-api-key`}
              type="text"
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              placeholder={getApiKeyPlaceholder(provider)}
            />
            {settings.apiKey ? (
              <>
                <Button 
                  variant="secondary" 
                  onClick={() => onVerify(localApiKey)}
                  disabled={isValidating}
                >
                  {isValidating ? 'Verifying...' : 'Reverify'}
                </Button>
                <Button 
                  variant="destructive"
                  onClick={onDeleteKey}
                  disabled={isValidating}
                >
                  Delete
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => onVerify(localApiKey)}
                disabled={!localApiKey || isValidating}
              >
                {isValidating ? 'Verifying...' : 'Verify'}
              </Button>
            )}
          </div>
        </div>
        
        {showBaseUrl && (
          <Collapsible 
            open={isBaseUrlOpen} 
            onOpenChange={setIsBaseUrlOpen}
            className="border rounded-md p-3"
          >
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  {isBaseUrlOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <h3 className="text-sm font-medium">Base URL (Optional)</h3>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <Input
                id={`${provider}-base-url`}
                placeholder="https://api.openai.com/v1"
                value={settings.options?.baseUrl || ''}
                onChange={(e) => onUpdateSetting('options', {
                  ...settings.options,
                  baseUrl: e.target.value
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Only change this if you're using a custom OpenAI-compatible API endpoint.
              </p>
            </CollapsibleContent>
          </Collapsible>
        )}

        {!hideDefaultModel && settings.apiKey && (
          <div className="space-y-2">
            <Label htmlFor={`${provider}-default-model`}>Active Model</Label>
            <Select
              value={settings.selectedModel}
              onValueChange={(value) => onUpdateSetting('selectedModel', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an active model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name || model.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 