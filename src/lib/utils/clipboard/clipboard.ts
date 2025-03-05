/**
 * Copies the provided text to the clipboard using the navigator.clipboard API
 * @param text - The text to copy to the clipboard
 * @returns A promise that resolves when the text has been copied
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('Failed to copy text to clipboard:', error);
    throw error;
  }
} 