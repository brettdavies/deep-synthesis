/**
 * Custom error class for API-related errors
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'APIError';
  }
} 