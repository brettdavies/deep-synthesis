import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import toast from 'react-hot-toast';
import { PaperOperations, ReportOperations } from '@/lib/db/operations';
import type { Paper } from '@/lib/db/schema/paper';
import type { Report } from '@/lib/db/schema/report';

/**
 * Custom hook to reactively load and manage database data
 * 
 * Uses Dexie's liveQuery for real-time reactivity - UI will update
 * automatically when data changes in this tab or other browser tabs
 * 
 * @returns Object containing papers, reports, loading state, error state, and total size
 */
export function useDatabaseData() {
  const [error, setError] = useState<Error | null>(null);

  // Reactively query papers with liveQuery
  const papers = useLiveQuery(
    async () => {
      try {
        const result = await PaperOperations.getAll();
        return result || [];
      } catch (err) {
        console.error('Error loading papers:', err);
        setError(err instanceof Error ? err : new Error('Failed to load papers'));
        toast.error('Error loading papers');
        return [];
      }
    },
    // No dependencies means this query only depends on the database data
    []
  );

  // Reactively query reports with liveQuery
  const reports = useLiveQuery(
    async () => {
      try {
        const result = await ReportOperations.getAll();
        return result || [];
      } catch (err) {
        console.error('Error loading reports:', err);
        setError(err instanceof Error ? err : new Error('Failed to load reports'));
        toast.error('Error loading reports');
        return [];
      }
    },
    []
  );

  // Calculate total size from papers
  const totalSize = useLiveQuery(
    () => {
      if (!papers) return 0;
      return papers.reduce((sum, paper) => sum + (paper?.pdfSize || 0), 0);
    },
    // This derived query depends on the papers query
    [papers]
  );

  // Determine if data is still loading
  const loading = papers === undefined || reports === undefined;

  return {
    papers: papers || [],
    reports: reports || [],
    totalSize: totalSize || 0,
    loading,
    error
  };
} 