import { ProviderRegistry } from './provider-registry';

/**
 * Get the user-selected model for a provider
 * @param registry The provider registry
 * @param providerName The name of the provider (e.g., 'openai')
 * @returns An object containing the provider, settings, and selected model
 * @throws Error if API key or model is not configured
 */
export function getUserSelectedModel(registry: ProviderRegistry, providerName: string) {
  const provider = registry.getProvider(providerName);
  const settings = registry.getProviderSettings(providerName);
  
  console.log(`Attempting to get model from provider: ${providerName}`);
  console.log(`Provider settings:`, JSON.stringify(settings, null, 2));
  
  if (!settings || !settings.apiKey) {
    throw new Error(`${providerName} API key is not configured. Please add your API key in settings.`);
  }
  
  if (!settings.selectedModel) {
    throw new Error(`No AI model selected. Please select a model in settings.`);
  }
  
  // Get the model info to check capabilities
  const allModels = provider.getModels();
  
  // Log model IDs instead of names if available
  console.log(`Available models:`, allModels.map(m => ({ 
    id: m.id || 'unknown', 
    name: m.name 
  })));
  console.log(`Looking for model ID: "${settings.selectedModel}"`);
  
  // Try to find the model by ID first if the ID field exists
  let selectedModel = allModels.find(model => 
    (model.id && model.id.toLowerCase() === settings.selectedModel.toLowerCase())
  );
  
  // If not found by ID, try a few other approaches
  if (!selectedModel) {
    // Try matching against name as fallback (case insensitive)
    selectedModel = allModels.find(model => 
      model.name.toLowerCase() === settings.selectedModel.toLowerCase()
    );
    
    if (selectedModel) {
      console.log(`Found model by name match: "${selectedModel.name}"`);
    } else {
      // Check for a model where the name matches the ID but with different formatting
      // For example: "o3-mini" (ID) should match "O3 Mini" (name)
      const normalizedSelectedModelId = settings.selectedModel
        .toLowerCase()
        .replace(/-/g, ' '); // Replace hyphens with spaces
      
      selectedModel = allModels.find(model => {
        const normalizedModelName = model.name
          .toLowerCase()
          .replace(/-/g, ' '); // Replace hyphens with spaces
        
        return normalizedModelName === normalizedSelectedModelId ||
               normalizedModelName.replace(/\s+/g, '') === normalizedSelectedModelId.replace(/\s+/g, '');
      });
      
      if (selectedModel) {
        console.log(`Found model by normalized name: "${selectedModel.name}"`);
      } else {
        // Try checking if the selected model ID is part of any model's name
        const partialMatches = allModels.filter(model => {
          const normalizedModelName = model.name.toLowerCase().replace(/-/g, ' ');
          const normalizedId = settings.selectedModel.toLowerCase().replace(/-/g, ' ');
          
          return normalizedModelName.includes(normalizedId) || 
                 normalizedId.includes(normalizedModelName);
        });
        
        if (partialMatches.length > 0) {
          console.log(`Found ${partialMatches.length} partial matches:`, 
                     partialMatches.map(m => m.name));
          
          // Use the first partial match
          selectedModel = partialMatches[0];
          console.log(`Using first partial match: "${selectedModel.name}"`);
        } else {
          throw new Error(`Selected model "${settings.selectedModel}" not found in available models. Please check your settings.`);
        }
      }
    }
  } else {
    console.log(`Found model by ID match: "${selectedModel.name}"`);
  }
  
  return {
    provider,
    settings,
    selectedModel
  };
}

/**
 * Check if a model supports structured output or JSON mode
 * @param model The model to check
 * @returns An object with flags for different output format capabilities
 */
export function getModelOutputCapabilities(model: any) {
  const supportsStructuredOutput = model.capabilities?.structuredOutput;
  const supportsJsonMode = model.capabilities?.jsonMode;
  
  return {
    supportsStructuredOutput,
    supportsJsonMode,
    supportsEither: supportsStructuredOutput || supportsJsonMode
  };
} 