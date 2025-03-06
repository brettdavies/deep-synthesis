import { LLMConfigError } from './types';
import type { LLMProvider, ProviderSettings } from './types';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { GrokProvider } from './providers/grok';
import { OpenRouterProvider } from './providers/openrouter';
import { GeminiProvider } from './providers/gemini';

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, LLMProvider> = new Map();
  private settings: Record<string, ProviderSettings> = {};

  private constructor() {
    // Initialize with empty providers - they'll be created when settings are loaded
    this.registerProvider('openai', new OpenAIProvider());
    this.registerProvider('anthropic', new AnthropicProvider());
    this.registerProvider('grok', new GrokProvider());
    this.registerProvider('openrouter', new OpenRouterProvider());
    this.registerProvider('gemini', new GeminiProvider());
  }

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  registerProvider(name: string, provider: LLMProvider): void {
    this.providers.set(name.toLowerCase(), provider);
  }

  getProvider(name: string): LLMProvider {
    const provider = this.providers.get(name.toLowerCase());
    if (!provider) {
      throw new LLMConfigError(`Provider "${name}" not found`);
    }
    return provider;
  }

  updateSettings(settings: Record<string, ProviderSettings>): void {
    this.settings = settings;
    
    // Recreate providers with new settings
    if (settings.openai) {
      this.providers.set('openai', new OpenAIProvider(settings.openai));
    }
    
    if (settings.anthropic) {
      this.providers.set('anthropic', new AnthropicProvider(settings.anthropic));
    }

    if (settings.grok) {
      this.providers.set('grok', new GrokProvider(settings.grok));
    }

    if (settings.openrouter) {
      this.providers.set('openrouter', new OpenRouterProvider(settings.openrouter));
    }
  }

  updateProviderSettings(name: string, settings: ProviderSettings): void {
    const providerName = name.toLowerCase();
    
    // Update settings record
    this.settings[providerName] = settings;
    
    // Recreate the provider with new settings
    if (providerName === 'openai') {
      this.providers.set(providerName, new OpenAIProvider(settings));
    } else if (providerName === 'anthropic') {
      this.providers.set(providerName, new AnthropicProvider(settings));
    } else if (providerName === 'grok') {
      this.providers.set(providerName, new GrokProvider(settings));
    } else if (providerName === 'openrouter') {
      this.providers.set(providerName, new OpenRouterProvider(settings));
    }
  }

  getProviderSettings(name: string): ProviderSettings | undefined {
    return this.settings[name.toLowerCase()];
  }

  getAllSettings(): Record<string, ProviderSettings> {
    return this.settings;
  }

  getAvailableProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  getAllProviders(): LLMProvider[] {
    return Array.from(this.providers.values());
  }
  
  // Create a temporary provider with the given API key for validation purposes
  createProviderWithKey(name: string, apiKey: string): LLMProvider | undefined {
    const providerName = name.toLowerCase();
    
    // Create a temporary settings object with just the API key
    const tempSettings: ProviderSettings = {
      apiKey,
      selectedModel: '',
      options: {}
    };
    
    // Based on the provider type, create a new instance with the temporary settings
    if (providerName === 'openai') {
      return new OpenAIProvider(tempSettings);
    } else if (providerName === 'anthropic') {
      return new AnthropicProvider(tempSettings);
    } else if (providerName === 'grok') {
      return new GrokProvider(tempSettings);
    } else if (providerName === 'openrouter') {
      return new OpenRouterProvider(tempSettings);
    } else if (providerName === 'gemini') {
      return new GeminiProvider(tempSettings);
    }
    
    return undefined;
  }
}