import type { ArxivSearchParams, ArxivSearchResponse } from './types';
import { searchArxiv } from './operations';

/**
 * Result of a batch search operation
 */
export interface BatchSearchResult {
  results: ArxivSearchResponse[];
  errors: Array<{
    params: ArxivSearchParams;
    error: Error;
  }>;
}

// Rate limiting configuration for arXiv API
const ARXIV_RATE_LIMIT_MS = 3000; // 3 seconds between requests

/**
 * Singleton class that manages rate-limited API calls to arXiv
 */
export class ArxivRateLimiter {
  private static instance: ArxivRateLimiter;
  private lastRequestTime: number = 0;
  private queuedRequests: Array<{
    params: ArxivSearchParams;
    resolve: (value: ArxivSearchResponse) => void;
    reject: (reason: Error) => void;
  }> = [];
  private isProcessing: boolean = false;

  /**
   * Get singleton instance
   */
  public static getInstance(): ArxivRateLimiter {
    if (!ArxivRateLimiter.instance) {
      ArxivRateLimiter.instance = new ArxivRateLimiter();
    }
    return ArxivRateLimiter.instance;
  }

  /**
   * Perform a rate-limited search to arXiv
   */
  public search(params: ArxivSearchParams): Promise<ArxivSearchResponse> {
    return new Promise<ArxivSearchResponse>((resolve, reject) => {
      // Queue the request
      this.queuedRequests.push({ params, resolve, reject });
      
      // Start processing queue if not already processing
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Search arXiv with multiple queries, respecting rate limits
   */
  public async searchBatch(
    paramsArray: ArxivSearchParams[]
  ): Promise<BatchSearchResult> {
    const results: ArxivSearchResponse[] = [];
    const errors: Array<{ params: ArxivSearchParams; error: Error }> = [];

    for (const params of paramsArray) {
      try {
        const result = await this.search(params);
        results.push(result);
      } catch (error) {
        errors.push({
          params,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    return { results, errors };
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.queuedRequests.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    // Determine how long to wait before the next request
    const waitTime = Math.max(0, ARXIV_RATE_LIMIT_MS - timeSinceLastRequest);
    
    // Wait if needed to respect rate limits
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Process the next request
    const request = this.queuedRequests.shift();
    if (!request) {
      this.processQueue();
      return;
    }
    
    // Update last request time
    this.lastRequestTime = Date.now();
    
    try {
      // Execute the arXiv search request
      const result = await searchArxiv(request.params);
      request.resolve(result);
    } catch (error) {
      // Handle error
      request.reject(
        error instanceof Error 
          ? error 
          : new Error(`ArXiv search failed: ${String(error)}`)
      );
    }
    
    // Continue processing the queue
    this.processQueue();
  }
}

// Export function wrappers around the singleton

/**
 * Perform a single arXiv search with rate limiting
 */
export async function rateLimitedSearch(
  params: ArxivSearchParams
): Promise<ArxivSearchResponse> {
  return ArxivRateLimiter.getInstance().search(params);
}

/**
 * Perform multiple arXiv searches with rate limiting
 */
export async function rateLimitedBatchSearch(
  paramsArray: ArxivSearchParams[]
): Promise<BatchSearchResult> {
  return ArxivRateLimiter.getInstance().searchBatch(paramsArray);
} 