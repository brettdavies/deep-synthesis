import { APIError } from '../errors/api-error';

/**
 * Base API client with common functionality
 */
export abstract class BaseAPIClient {
  protected baseUrl: string;
  protected headers: Record<string, string>;

  constructor(baseUrl: string, headers: Record<string, string> = {}) {
    this.baseUrl = baseUrl;
    this.headers = headers;
  }

  /**
   * Make an HTTP request
   */
  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const url = this.buildUrl(endpoint);
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new APIError(
          `API request failed: ${response.status} ${response.statusText}`,
          response.status,
          await response.json().catch(() => ({}))
        );
      }

      // Handle different response types
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return response.json();
      } else if (contentType?.includes('application/xml')) {
        return response.text() as Promise<T>;
      } else if (contentType?.includes('application/pdf')) {
        return response.blob() as Promise<T>;
      }
      
      return response.text() as Promise<T>;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('API request failed', 500, { error: String(error) });
    }
  }

  /**
   * Build full URL from endpoint
   */
  protected buildUrl(endpoint: string): string {
    return new URL(endpoint, this.baseUrl).toString();
  }

  /**
   * Set request headers
   */
  protected setHeaders(headers: Record<string, string>): void {
    this.headers = {
      ...this.headers,
      ...headers,
    };
  }

  /**
   * Add retry logic to requests
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delay = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt === maxRetries) break;
        
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, delay * Math.pow(2, attempt - 1))
        );
      }
    }
    
    throw lastError;
  }
} 