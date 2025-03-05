import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { PaperOperations } from '@/lib/db/operations';
import { downloadPdfChunked, getPdfFromChunks, pdfBlobCache } from '@/lib/services/pdf';
import { formatFileSize } from '@/lib/utils/formatting/size';
import type { Paper } from '@/lib/db/schema/paper';
import { ensureHttps } from '@/lib/utils/network/url';

/**
 * Custom hook for paper operations
 * 
 * This version is compatible with liveQuery and doesn't require state update functions
 * as the UI will update automatically when the database changes
 */
export function usePaperOperations(papers: Paper[]) {
  const navigate = useNavigate();
  const [loadingPaperIds, setLoadingPaperIds] = useState<Set<string>>(new Set());

  // Confirmation dialog states
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showDeleteAllConfirmation, setShowDeleteAllConfirmation] = useState(false);
  const [showDeleteAllPdfsConfirmation, setShowDeleteAllPdfsConfirmation] = useState(false);
  const [showRemovePdfConfirmation, setShowRemovePdfConfirmation] = useState(false);
  const [pendingPaperId, setPendingPaperId] = useState<string | null>(null);
  const [pendingPaper, setPendingPaper] = useState<Paper | null>(null);

  // Helper functions for tracking loading state
  const addLoadingPaper = (id: string) => {
    setLoadingPaperIds(prev => new Set(prev).add(id));
  };

  const removeLoadingPaper = (id: string) => {
    setLoadingPaperIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const isPaperLoading = (id: string) => {
    return loadingPaperIds.has(id);
  };

  // Initialize PDF cache cleanup on component mount
  useEffect(() => {
    // Clean up expired blobs now
    pdfBlobCache.removeExpired();
    
    // Set up periodic cleanup every hour
    const cleanupInterval = setInterval(() => {
      pdfBlobCache.removeExpired();
    }, 60 * 60 * 1000); // 1 hour
    
    return () => {
      clearInterval(cleanupInterval);
    };
  }, []);

  /**
   * Open delete paper confirmation dialog
   */
  const confirmDeletePaper = (id: string) => {
    setPendingPaperId(id);
    setShowDeleteConfirmation(true);
  };

  /**
   * Delete a paper by ID
   */
  const handleDeletePaper = async () => {
    if (!pendingPaperId) return;
    
    try {
      await PaperOperations.delete(pendingPaperId);
      toast.success('Paper deleted successfully');
      // No need to update state - liveQuery will handle it
    } catch (err) {
      console.error('Error deleting paper:', err);
      toast.error('Failed to delete paper');
    } finally {
      // Reset pending paper ID
      setPendingPaperId(null);
      // Close the confirmation dialog
      setShowDeleteConfirmation(false);
    }
  };

  /**
   * Open delete all papers confirmation dialog
   */
  const confirmDeleteAllPapers = () => {
    setShowDeleteAllConfirmation(true);
  };

  /**
   * Delete all papers
   */
  const handleDeleteAllPapers = async () => {
    try {
      // Get all papers and delete them one by one
      const allPapers = await PaperOperations.getAll();
      const deletePromises = allPapers.map(paper => PaperOperations.delete(paper.id));
      await Promise.all(deletePromises);
      toast.success('All papers deleted successfully');
      // No need to update state - liveQuery will handle it
    } catch (err) {
      console.error('Error deleting all papers:', err);
      toast.error('Failed to delete all papers');
    } finally {
      // Close the confirmation dialog
      setShowDeleteAllConfirmation(false);
    }
  };

  /**
   * Download a paper PDF
   */
  const handleDownloadPdf = async (paper: Paper) => {
    if (paper.pdfDownloaded) {
      console.log(`PDF already downloaded for: ${paper.id}`);
      toast('PDF already downloaded');
      return;
    }

    try {
      console.log(`Downloading PDF for paper: ${paper.id}`);
      addLoadingPaper(paper.id!);
      
      // Download the PDF
      await downloadPdfChunked(paper, (progress) => {
        // This callback will be called with progress updates
        console.log(`Download progress for ${paper.id}: ${progress}%`);
      });
      
      removeLoadingPaper(paper.id!);
      
      // Get the updated paper to get the size, but we only need the metadata, not the chunks
      const updatedPaper = await PaperOperations.getById(paper.id!);
      console.log(`Paper updated after download:`, updatedPaper);
      
      if (updatedPaper?.pdfSize) {
        toast.success(`PDF downloaded (${formatFileSize(updatedPaper.pdfSize)})`);
      } else {
        toast.success('PDF downloaded');
      }
      
      // Note: We're no longer automatically opening the PDF after download
      // This allows the user to explicitly click the View PDF button when they want to view it
    } catch (err) {
      removeLoadingPaper(paper.id!);
      console.error('Error downloading PDF:', err);
      // More detailed error info
      if (err instanceof Error) {
        console.error(`Error name: ${err.name}, message: ${err.message}, stack: ${err.stack}`);
      }
      toast.error(`Failed to download PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  /**
   * Open delete all PDFs confirmation dialog
   */
  const confirmDeleteAllPdfs = () => {
    setShowDeleteAllPdfsConfirmation(true);
  };

  /**
   * Delete all PDFs
   */
  const handleDeleteAllPdfs = async () => {
    try {
      // Get all papers with PDFs
      const allPapers = await PaperOperations.getAll();
      const papersWithPdfs = allPapers.filter(p => p.pdfDownloaded);
      
      // Update each paper to remove PDF data
      for (const paper of papersWithPdfs) {
        await PaperOperations.update(paper.id, {
          pdfChunks: undefined,
          pdfSize: undefined,
          pdfDownloadProgress: undefined,
          pdfDownloaded: false
        });
      }
      
      toast.success("All downloaded PDFs have been removed");
      // No need to update state - liveQuery will handle it
    } catch (err) {
      console.error('Error deleting all PDFs:', err);
      toast.error('Failed to delete all PDFs');
    } finally {
      // Close the confirmation dialog
      setShowDeleteAllPdfsConfirmation(false);
    }
  };

  /**
   * View a paper PDF
   */
  const handleViewPdf = async (paper: Paper) => {
    // If PDF is not downloaded, open the external URL
    if (!paper.pdfDownloaded) {
      console.log(`Opening external PDF URL: ${paper.pdfUrl}`);
      
      // Use the ensureHttps helper to make sure we have a valid URL
      const url = ensureHttps(paper.pdfUrl);
      
      if (typeof window !== 'undefined') {
        window.open(url, '_blank');
        console.log(`Opened external PDF URL in new tab`);
      } else {
        console.error('window is not defined - running in a non-browser environment?');
        toast.error('Cannot open PDF: browser environment not detected');
      }
      return;
    }
    
    try {
      console.log(`Attempting to view downloaded PDF for paper: ${paper.id}`);
      
      // Get PDF blob from database - will check cache first, then load from IndexedDB if needed
      const pdfBlob = await getPdfFromChunks(paper);
      console.log(`PDF blob retrieved:`, pdfBlob);
      
      if (!pdfBlob) {
        console.error(`PDF not found for paper: ${paper.id}`);
        toast.error('PDF not found');
        return;
      }
      
      // Create a blob URL and open it in a new tab
      const pdfUrl = URL.createObjectURL(pdfBlob);
      console.log(`Created blob URL: ${pdfUrl}`);
      
      // In Bun, let's ensure we're using a fully qualified URL
      if (typeof window !== 'undefined') {
        window.open(pdfUrl, '_blank');
        console.log(`Opened PDF in new tab`);
        
        // Schedule URL cleanup after a delay to ensure the browser has time to load the PDF
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
          console.log(`Revoked blob URL: ${pdfUrl}`);
        }, 60000); // 1 minute
      } else {
        console.error('window is not defined - running in a non-browser environment?');
        toast.error('Cannot open PDF: browser environment not detected');
      }
    } catch (err) {
      console.error('Error viewing PDF:', err);
      // More detailed error info
      if (err instanceof Error) {
        console.error(`Error name: ${err.name}, message: ${err.message}, stack: ${err.stack}`);
      }
      toast.error(`Failed to view PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  /**
   * Open remove PDF confirmation dialog
   */
  const confirmRemovePdf = (paper: Paper) => {
    setPendingPaper(paper);
    setShowRemovePdfConfirmation(true);
  };

  /**
   * Remove a paper's PDF
   */
  const handleRemovePdf = async () => {
    if (!pendingPaper) return;
    
    try {
      await PaperOperations.update(pendingPaper.id, {
        pdfChunks: undefined,
        pdfSize: undefined,
        pdfDownloadProgress: undefined,
        pdfDownloaded: false
      });
      toast.success('PDF removed successfully');
      // No need to update state - liveQuery will handle it
    } catch (err) {
      console.error('Error removing PDF:', err);
      toast.error('Failed to remove PDF');
    } finally {
      // Reset pending paper
      setPendingPaper(null);
      // Close the confirmation dialog
      setShowRemovePdfConfirmation(false);
    }
  };

  return {
    // Dialog state
    showDeleteConfirmation,
    setShowDeleteConfirmation,
    showDeleteAllConfirmation,
    setShowDeleteAllConfirmation,
    showDeleteAllPdfsConfirmation,
    setShowDeleteAllPdfsConfirmation,
    showRemovePdfConfirmation,
    setShowRemovePdfConfirmation,
    
    // Confirmation methods (for opening dialogs)
    confirmDeletePaper,
    confirmDeleteAllPapers,
    confirmDeleteAllPdfs,
    confirmRemovePdf,
    
    // Action handlers (executed after confirmation)
    handleDeletePaper,
    handleDeleteAllPapers,
    handleDownloadPdf,
    handleDeleteAllPdfs,
    handleViewPdf,
    handleRemovePdf,
    
    // Helper methods
    isPaperLoading,
    
    // Data for dialogs
    pendingPaperId,
    pendingPaper
  };
} 