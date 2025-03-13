/**
 * Generic retry utility for API calls with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries (default: 3)
 * @param baseDelay Base delay in ms before retrying (default: 1000)
 * @returns Promise of the function result
 */
export async function withRetry<T>(
  fn: () => Promise<T>, 
  maxRetries = 3, 
  baseDelay = 1000
): Promise<T> {
  let retries = 0;
  
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      // Don't retry for specific errors
      if (error.message?.includes('invalid key') || 
          error.message?.includes('unauthorized') ||
          error.status === 401 || 
          error.status === 403) {
        throw error;
      }
      
      retries++;
      
      if (retries > maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, retries - 1);
      console.log(`Retrying after ${delay}ms... (${retries}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
} 