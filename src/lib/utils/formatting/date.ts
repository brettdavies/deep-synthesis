/**
 * Formats a date into a localized string representation
 * @param date - The date to format
 * @returns A formatted date string
 */
export function formatDate(date: Date | string): string {
  // Ensure we have a Date object
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Return localized date string
  return dateObj.toLocaleDateString();
} 