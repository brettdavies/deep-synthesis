import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ReportOperations } from '@/lib/db/operations';
import type { Report } from '@/lib/db/schema/report';

/**
 * Custom hook to fetch the most recent reports
 * 
 * @param limit The maximum number of reports to fetch (default: 5)
 * @returns Object containing recent reports, loading state and error state
 */
export function useRecentReports(limit: number = 5) {
  const [error, setError] = useState<Error | null>(null);

  // Reactively query recent reports with liveQuery
  const recentReports = useLiveQuery(
    async () => {
      try {
        const result = await ReportOperations.getAll({
          orderBy: 'updatedAt',
          descending: true,
          limit
        });
        return result || [];
      } catch (err) {
        console.error('Error loading recent reports:', err);
        setError(err instanceof Error ? err : new Error('Failed to load recent reports'));
        return [];
      }
    },
    // The limit is a dependency
    [limit]
  );

  // Determine if data is still loading
  const loading = recentReports === undefined;

  return {
    recentReports: recentReports || [],
    loading,
    error
  };
} 