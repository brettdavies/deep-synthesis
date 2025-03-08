import { useNavigate } from 'react-router-dom';
import { useState, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import toast from 'react-hot-toast';
import { BriefOperations } from '@/lib/db/operations';
import type { Brief } from '@/lib/db/schema/brief';
import type { Paper } from '@/lib/db/schema/paper';

// Types for loading states
interface LoadingStates {
  createBrief: boolean;
  updateQuery: boolean;
  updatePapers: boolean;
  finalizeContent: boolean;
  deleteBrief: boolean;
  deleteAllBriefs: boolean;
}

/**
 * Custom hook for brief operations that abstracts database interactions
 * and provides reactive data access through Dexie LiveQuery
 * 
 * This hook provides:
 * 1. LiveQuery-based reactive data fetching
 * 2. Imperative database operations with error handling
 * 3. Loading states for all async operations
 * 4. Navigation helpers for routing
 * 5. Confirmation dialog state management
 * 
 * All actual database operations are performed in the BriefOperations class,
 * ensuring separation of concerns and maintainability.
 * 
 * @returns Object containing reactive queries, operations, states, and loading indicators
 */
export function useBriefOperations() {
  const navigate = useNavigate();
  
  // Confirmation dialog states
  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showDeleteAllConfirmation, setShowDeleteAllConfirmation] = useState(false);
  
  // Loading states for async operations
  const [loading, setLoading] = useState<LoadingStates>({
    createBrief: false,
    updateQuery: false,
    updatePapers: false,
    finalizeContent: false,
    deleteBrief: false,
    deleteAllBriefs: false
  });

  // Reset loading state on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      setLoading({
        createBrief: false,
        updateQuery: false,
        updatePapers: false,
        finalizeContent: false,
        deleteBrief: false,
        deleteAllBriefs: false
      });
    };
  }, []);

  /**
   * Get a brief by ID using LiveQuery for reactivity
   */
  const getBrief = (id: string | null) => {
    return useLiveQuery(
      async () => {
        if (!id) return null;
        return await BriefOperations.getById(id);
      },
      [id]
    );
  };
  
  /**
   * Get all briefs with optional filtering using LiveQuery for reactivity
   */
  const getAllBriefs = (options?: { 
    limit?: number; 
    orderBy?: keyof Brief;
    descending?: boolean;
  }) => {
    return useLiveQuery(
      async () => {
        return await BriefOperations.getAll({
          limit: options?.limit,
          orderBy: options?.orderBy || 'updatedAt',
          descending: options?.descending !== false
        });
      },
      [options?.limit, options?.orderBy, options?.descending]
    );
  };

  /**
   * Get a brief by ID directly (non-reactive, for immediate use)
   */
  const getBriefById = async (id: string): Promise<Brief | null> => {
    if (!id) return null;
    return await BriefOperations.getById(id);
  };

  /**
   * Confirm delete a brief
   */
  const confirmDeleteBrief = useCallback((id: string) => {
    setSelectedBriefId(id);
    setShowDeleteConfirmation(true);
  }, []);

  /**
   * Confirm delete all briefs
   */
  const confirmDeleteAllBriefs = useCallback(() => {
    setShowDeleteAllConfirmation(true);
  }, []);

  /**
   * Delete a brief by ID
   */
  const handleDeleteBrief = useCallback(async () => {
    if (!selectedBriefId) return;
    
    setLoading(prev => ({ ...prev, deleteBrief: true }));
    
    try {
      await BriefOperations.delete(selectedBriefId);
      toast.success('Brief deleted successfully');
      setShowDeleteConfirmation(false);
      // LiveQuery will automatically update components using the data
    } catch (err) {
      console.error('Error deleting brief:', err);
      toast.error('Failed to delete brief');
    } finally {
      setLoading(prev => ({ ...prev, deleteBrief: false }));
    }
  }, [selectedBriefId]);

  /**
   * View a brief
   */
  const handleViewBrief = useCallback((id: string) => {
    navigate(`/brief/${id}`);
  }, [navigate]);

  /**
   * Edit a brief
   */
  const handleEditBrief = useCallback((id: string) => {
    navigate(`/brief/${id}/edit`);
  }, [navigate]);

  /**
   * Delete all briefs
   */
  const handleDeleteAllBriefs = useCallback(async () => {
    setLoading(prev => ({ ...prev, deleteAllBriefs: true }));
    
    try {
      // Use the optimized method from BriefOperations
      const count = await BriefOperations.deleteAll();
      toast.success(`Deleted ${count} briefs successfully`);
      setShowDeleteAllConfirmation(false);
      // LiveQuery will automatically update components using the data
    } catch (err) {
      console.error('Error deleting all briefs:', err);
      toast.error('Failed to delete all briefs');
    } finally {
      setLoading(prev => ({ ...prev, deleteAllBriefs: false }));
    }
  }, []);

  /**
   * Create a new brief with initial query
   */
  const createInitialBrief = useCallback(async (query: string): Promise<string> => {
    setLoading(prev => ({ ...prev, createBrief: true }));
    
    try {
      // Use the optimized method from BriefOperations
      const briefId = await BriefOperations.createInitialBrief(query);
      toast.success('Created new research brief');
      return briefId;
    } catch (error) {
      console.error('Error creating initial brief:', error);
      toast.error('Error creating brief: ' + (error as Error).message);
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, createBrief: false }));
    }
  }, []);

  /**
   * Update brief with refined query
   */
  const updateBriefWithRefinedQuery = useCallback(async (briefId: string, refinedQuery: string): Promise<void> => {
    setLoading(prev => ({ ...prev, updateQuery: true }));
    
    try {
      // Use the optimized method from BriefOperations
      const success = await BriefOperations.updateWithRefinedQuery(briefId, refinedQuery);
      if (success) {
        toast.success('Query refined successfully');
      }
    } catch (error) {
      console.error('Error updating brief with refined query:', error);
      toast.error('Error updating query: ' + (error as Error).message);
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, updateQuery: false }));
    }
  }, []);

  /**
   * Update brief with found papers
   */
  const updateBriefWithFoundPapers = useCallback(async (briefId: string, foundPapers: Paper[]): Promise<void> => {
    setLoading(prev => ({ ...prev, updatePapers: true }));
    
    try {
      // Use the optimized method from BriefOperations
      const success = await BriefOperations.updateWithPaperReferences(briefId, foundPapers, true);
      if (success) {
        console.log('Updated brief with found papers:', foundPapers.length);
      }
    } catch (error) {
      console.error('Error updating brief with found papers:', error);
      toast.error('Error updating papers: ' + (error as Error).message);
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, updatePapers: false }));
    }
  }, []);

  /**
   * Update brief with selected papers
   */
  const updateBriefWithSelectedPapers = useCallback(async (briefId: string, selectedPapers: Paper[]): Promise<void> => {
    setLoading(prev => ({ ...prev, updatePapers: true }));
    
    try {
      // Use the optimized method from BriefOperations
      const success = await BriefOperations.updateWithPaperReferences(briefId, selectedPapers, true);
      if (success) {
        toast.success(`Selected ${selectedPapers.length} papers for brief`);
      }
    } catch (error) {
      console.error('Error updating brief with selected papers:', error);
      toast.error('Error updating selected papers: ' + (error as Error).message);
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, updatePapers: false }));
    }
  }, []);

  /**
   * Finalize brief with AI-generated content
   */
  const finalizeBriefWithContent = useCallback(async (briefId: string, briefContent: string, refinedQuery: string): Promise<void> => {
    setLoading(prev => ({ ...prev, finalizeContent: true }));
    
    try {
      // Use the optimized method from BriefOperations
      const success = await BriefOperations.finalizeWithContent(briefId, briefContent, refinedQuery);
      if (success) {
        toast.success('Research brief generated successfully');
      }
    } catch (error) {
      console.error('Error finalizing brief:', error);
      toast.error('Error generating brief: ' + (error as Error).message);
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, finalizeContent: false }));
    }
  }, []);

  return {
    // Reactive data access
    getBrief,
    getAllBriefs,
    getBriefById,
    
    // Operations
    handleDeleteBrief,
    handleViewBrief,
    handleEditBrief,
    handleDeleteAllBriefs,
    confirmDeleteBrief,
    confirmDeleteAllBriefs,
    
    // Brief creation operations
    createInitialBrief,
    updateBriefWithRefinedQuery,
    updateBriefWithFoundPapers,
    updateBriefWithSelectedPapers,
    finalizeBriefWithContent,
    
    // Confirmation states
    selectedBriefId,
    showDeleteConfirmation,
    setShowDeleteConfirmation,
    showDeleteAllConfirmation,
    setShowDeleteAllConfirmation,
    
    // Loading states
    loading
  };
} 