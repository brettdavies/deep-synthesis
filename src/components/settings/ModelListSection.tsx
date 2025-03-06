import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import type { ModelInfo, ProviderSettings } from '@/lib/llm/types';
import { ListFilter, Star } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { PROVIDER_ORDER } from '@/lib/llm/constants';

export interface ModelListSectionProps {
  availableModels: ModelInfo[];
  settings: Record<string, ProviderSettings>;
  updateModelEnabled: (modelId: string, enabled: boolean, provider: string) => void;
  onSetDefaultModel: (provider: string, modelId: string) => void;
}

export function ModelListSection({ availableModels, settings, updateModelEnabled, onSetDefaultModel }: ModelListSectionProps) {
  // Group models by provider (normalized to lowercase)
  const modelsByProvider = availableModels.reduce<Record<string, ModelInfo[]>>((acc, model) => {
    const provider = model.provider.toLowerCase();
    if (!acc[provider]) {
      acc[provider] = [];
    }
    acc[provider].push(model);
    return acc;
  }, {});

  const isModelEnabled = (modelId: string, provider: string) => {
    const normalizedProvider = provider.toLowerCase();
    const modelSettings = settings[normalizedProvider]?.options?.models?.[modelId];
    return !modelSettings || modelSettings.enabled !== false;
  };

  const isDefaultModel = (modelId: string, provider: string) => {
    const normalizedProvider = provider.toLowerCase();
    return settings[normalizedProvider]?.selectedModel === modelId;
  };

  // Sort providers according to PROVIDER_ORDER
  const sortedProviders = Object.keys(modelsByProvider).sort((a, b) => {
    const indexA = PROVIDER_ORDER.indexOf(a.toLowerCase() as typeof PROVIDER_ORDER[number]);
    const indexB = PROVIDER_ORDER.indexOf(b.toLowerCase() as typeof PROVIDER_ORDER[number]);
    return indexA - indexB;
  });

  return (
    <Card className="border shadow-sm w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-xl">
          <ListFilter className="mr-2 h-5 w-5 text-primary" />
          Available Models
        </CardTitle>
        <CardDescription>
          Select the models you want to use from your available providers
        </CardDescription>
      </CardHeader>
      <CardContent>
        {availableModels.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No models available. Verify your API keys in the Provider Settings below.
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {sortedProviders.map(provider => {
              const models = modelsByProvider[provider];
              
              // Find active model
              const defaultModel = models.find(model => model.isDefault);
              
              // Sort remaining models alphabetically
              const remainingModels = models
                .filter(model => !model.isDefault)
                .sort((a, b) => a.name.localeCompare(b.name));
              
              return (
                <div key={provider} className="border rounded-md p-3 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-medium">{provider.charAt(0).toUpperCase() + provider.slice(1)}</h3>
                    <div className="text-xs text-muted-foreground">
                      ({models.length} models)
                    </div>
                  </div>
                  
                  <div className="pl-6 space-y-2 min-w-fit">
                    {/* Active model section */}
                    {defaultModel && (
                      <>
                        <div className="flex items-center space-x-2">
                          <div className="w-4" /> {/* Spacer to replace checkbox */}
                          <label
                            className="text-sm font-medium leading-none flex items-center gap-2"
                          >
                            {defaultModel.name || defaultModel.id}
                            <Star className="h-3 w-3 fill-current text-primary" />
                          </label>
                        </div>
                        <Separator className="my-2 bg-border" />
                      </>
                    )}
                    
                    {/* Other models */}
                    {remainingModels.map(model => {
                      const enabled = isModelEnabled(model.id, provider);
                      return (
                        <div key={model.id} className="flex items-center space-x-2 whitespace-nowrap">
                          <Checkbox 
                            id={`model-${model.id}`}
                            checked={enabled}
                            onCheckedChange={(checked) => {
                              updateModelEnabled(model.id, !!checked, provider);
                            }}
                          />
                          <label
                            htmlFor={`model-${model.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                          >
                            {model.name || model.id}
                            {enabled && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Star 
                                      className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer" 
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onSetDefaultModel(provider, model.id);
                                      }}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Make active model</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 