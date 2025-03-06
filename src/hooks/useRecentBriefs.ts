import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BriefOperations } from '@/lib/db/operations';

/**
 * Custom hook to fetch the most recent briefs
 * 
 * @param limit The maximum number of briefs to fetch (default: 5)
 * @returns Object containing recent briefs, loading state and error state
 */
export function useRecentBriefs(limit: number = 5) {
  const [error, setError] = useState<Error | null>(null);

  // Reactively query recent briefs with liveQuery
  const recentBriefs = useLiveQuery(
    async () => {
      try {
        const result = await BriefOperations.getAll({
          orderBy: 'updatedAt',
          descending: true,
          limit
        });
        return result || [];
      } catch (err) {
        console.error('Error loading recent briefs:', err);
        setError(err instanceof Error ? err : new Error('Failed to load recent briefs'));
        return [];
      }
    },
    // The limit is a dependency
    [limit]
  );

  // Determine if data is still loading
  const loading = recentBriefs === undefined;

  return {
    recentBriefs: recentBriefs || [],
    loading,
    error
  };
} 