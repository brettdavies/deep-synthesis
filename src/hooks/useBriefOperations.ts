import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { BriefOperations } from '@/lib/db/operations';
import type { Brief } from '@/lib/db/schema/brief';

/**
 * Custom hook for   operations
 * 
 * This version is compatible with liveQuery and doesn't require state update functions
 * as the UI will update automatically when the database changes
 */
export function useBriefOperations() {
  const navigate = useNavigate();
  
  // Confirmation dialog states
  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showDeleteAllConfirmation, setShowDeleteAllConfirmation] = useState(false);

  /**
   * Confirm delete a brief
   */
  const confirmDeleteBrief = (id: string) => {
    setSelectedBriefId(id);
    setShowDeleteConfirmation(true);
  };

  /**
   * Confirm delete all briefs
   */
  const confirmDeleteAllBriefs = () => {
    setShowDeleteAllConfirmation(true);
  };

  /**
   * Delete a brief by ID
   */
  const handleDeleteBrief = async () => {
    if (!selectedBriefId) return;
    
    try {
      await BriefOperations.delete(selectedBriefId);
      toast.success('Brief deleted successfully');
      setShowDeleteConfirmation(false);
      // No need to update state - liveQuery will handle it
    } catch (err) {
      console.error('Error deleting brief:', err);
      toast.error('Failed to delete brief');
    }
  };

  /**
    * View a brief
   */
  const handleViewBrief = (id: string) => {
    navigate(`/brief/${id}`);
  };

  /**
   * Delete all briefs
   */
  const handleDeleteAllBriefs = async () => {
    try {
      // Get all briefs and delete them one by one
      const allBriefs = await BriefOperations.getAll();
      const deletePromises = allBriefs.map(brief => BriefOperations.delete(brief.id));
      await Promise.all(deletePromises);
      toast.success('All briefs deleted successfully');
      setShowDeleteAllConfirmation(false);
      // No need to update state - liveQuery will handle it
    } catch (err) {
      console.error('Error deleting all briefs:', err);
      toast.error('Failed to delete all briefs');
    }
  };

  return {
    // Operations
    handleDeleteBrief,
    handleViewBrief,
    handleDeleteAllBriefs,
    confirmDeleteBrief,
    confirmDeleteAllBriefs,
    
    // Confirmation states
    selectedBriefId,
    showDeleteConfirmation,
    setShowDeleteConfirmation,
    showDeleteAllConfirmation,
    setShowDeleteAllConfirmation
  };
} 