/**
 * Format a number of bytes into a human-readable string
 * @param bytes Number of bytes to format
 * @returns Formatted string (e.g., "0.1 MB" for 100KB files)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  // If file is under 1KB, show in bytes
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  
  // For everything else, show in MB
  const mbSize = bytes / 1024 / 1024;
  return `${parseFloat(mbSize.toFixed(1))} MB`;
} 