/**
 * Ensures a URL uses HTTPS instead of HTTP
 * @param url URL to convert
 * @returns URL with HTTPS
 */
export function ensureHttps(url: string): string {
  return url.replace(/^http:\/\//i, 'https://');
} 