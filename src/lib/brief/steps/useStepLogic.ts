import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { Brief } from '@/lib/db/schema/brief';
import toast from 'react-hot-toast';

/**
 * Custom hook that encapsulates common step functionality
 * @param briefId The ID of the brief being edited
 * @returns Common step functionality and state
 */
export function useStepLogic(briefId: string) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch the brief using LiveQuery to ensure reactivity
  const brief = useLiveQuery(
    () => briefId ? db.briefs.get(briefId) : null,
    [briefId]
  );
  
  // Centralized error handling
  const handleError = useCallback((error: unknown) => {
    console.error(`Step error:`, error);
    toast.error(`Something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}`);
    setIsLoading(false);
    return false; // Convenient for early returns in try/catch blocks
  }, []);
  
  // Helper function to safely update brief properties
  const updateBrief = useCallback(async (updates: Partial<Brief>) => {
    if (!briefId) return false;
    
    try {
      setIsLoading(true);
      await db.briefs.update(briefId, {
        ...updates,
        updatedAt: new Date()
      });
      setIsLoading(false);
      return true;
    } catch (error) {
      return handleError(error);
    }
  }, [briefId, handleError]);
  
  return {
    brief,
    isLoading, 
    setIsLoading,
    handleError,
    updateBrief
  };
} 