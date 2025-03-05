import { useState } from 'react';
import toast from 'react-hot-toast';

/**
 * Custom hook to handle copy-to-clipboard functionality
 * 
 * @returns {Object} Object containing copy function and copied state
 */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);

  /**
   * Copy text to clipboard
   */
  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  return {
    handleCopyToClipboard,
    copied
  };
} 