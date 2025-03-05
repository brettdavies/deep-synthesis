/**
 * PDF blob cache with 24-hour expiration
 */

interface CachedBlob {
  blob: Blob;
  timestamp: number;
}

// 24 hours in milliseconds
const EXPIRATION_TIME = 24 * 60 * 60 * 1000;

class PdfBlobCache {
  private cache: Map<string, CachedBlob> = new Map();

  /**
   * Get a cached PDF blob if it exists and hasn't expired
   * @param paperId The paper ID
   * @returns The cached blob or null if not found or expired
   */
  get(paperId: string): Blob | null {
    const cached = this.cache.get(paperId);
    
    if (!cached) {
      return null;
    }
    
    // Check if the cached blob has expired
    const now = Date.now();
    if (now - cached.timestamp > EXPIRATION_TIME) {
      console.log(`Cached PDF blob for paper ${paperId} has expired, removing from cache`);
      this.cache.delete(paperId);
      return null;
    }
    
    return cached.blob;
  }

  /**
   * Cache a PDF blob
   * @param paperId The paper ID
   * @param blob The PDF blob to cache
   */
  set(paperId: string, blob: Blob): void {
    console.log(`Caching PDF blob for paper ${paperId}`);
    this.cache.set(paperId, {
      blob,
      timestamp: Date.now()
    });
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    console.log('Clearing PDF blob cache');
    this.cache.clear();
  }

  /**
   * Remove expired blobs from the cache
   * @returns The number of expired blobs removed
   */
  removeExpired(): number {
    let count = 0;
    const now = Date.now();
    
    for (const [paperId, cached] of this.cache.entries()) {
      if (now - cached.timestamp > EXPIRATION_TIME) {
        this.cache.delete(paperId);
        count++;
      }
    }
    
    if (count > 0) {
      console.log(`Removed ${count} expired PDF blobs from cache`);
    }
    
    return count;
  }
}

// Export a singleton instance
export const pdfBlobCache = new PdfBlobCache(); 
