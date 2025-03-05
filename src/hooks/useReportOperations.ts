import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { ReportOperations } from '@/lib/db/operations';
import type { Report } from '@/lib/db/schema/report';

/**
 * Custom hook for report operations
 * 
 * This version is compatible with liveQuery and doesn't require state update functions
 * as the UI will update automatically when the database changes
 */
export function useReportOperations() {
  const navigate = useNavigate();
  
  // Confirmation dialog states
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showDeleteAllConfirmation, setShowDeleteAllConfirmation] = useState(false);

  /**
   * Confirm delete a report
   */
  const confirmDeleteReport = (id: string) => {
    setSelectedReportId(id);
    setShowDeleteConfirmation(true);
  };

  /**
   * Confirm delete all reports
   */
  const confirmDeleteAllReports = () => {
    setShowDeleteAllConfirmation(true);
  };

  /**
   * Delete a report by ID
   */
  const handleDeleteReport = async () => {
    if (!selectedReportId) return;
    
    try {
      await ReportOperations.delete(selectedReportId);
      toast.success('Report deleted successfully');
      setShowDeleteConfirmation(false);
      // No need to update state - liveQuery will handle it
    } catch (err) {
      console.error('Error deleting report:', err);
      toast.error('Failed to delete report');
    }
  };

  /**
   * View a report
   */
  const handleViewReport = (id: string) => {
    navigate(`/report/${id}`);
  };

  /**
   * Delete all reports
   */
  const handleDeleteAllReports = async () => {
    try {
      // Get all reports and delete them one by one
      const allReports = await ReportOperations.getAll();
      const deletePromises = allReports.map(report => ReportOperations.delete(report.id));
      await Promise.all(deletePromises);
      toast.success('All reports deleted successfully');
      setShowDeleteAllConfirmation(false);
      // No need to update state - liveQuery will handle it
    } catch (err) {
      console.error('Error deleting all reports:', err);
      toast.error('Failed to delete all reports');
    }
  };

  return {
    // Operations
    handleDeleteReport,
    handleViewReport,
    handleDeleteAllReports,
    confirmDeleteReport,
    confirmDeleteAllReports,
    
    // Confirmation states
    selectedReportId,
    showDeleteConfirmation,
    setShowDeleteConfirmation,
    showDeleteAllConfirmation,
    setShowDeleteAllConfirmation
  };
} 