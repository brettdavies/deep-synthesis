import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Types
import type { Paper } from '@/lib/db/schema/paper';

// Custom hooks
import { useDatabaseData } from '@/hooks/useDatabaseData';
import { usePaperOperations } from '@/hooks/usePaperOperations';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';

// Components
import { EmptyState } from '@/components/common/EmptyState';
import { PapersDataTable } from '@/components/papers/PapersDataTable';
import { PapersHeader } from '@/components/papers/PapersHeader';
import { ContentModal } from '@/components/papers/ContentModal';
import { DeleteConfirmationDialog } from '@/components/common/DeleteConfirmationDialog';
import { Loader } from '@/components/ui/loader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

/**
 * PapersPage component for displaying and managing papers
 */
export default function PapersPage() {
  const navigate = useNavigate();
  
  // Get data reactively from the database
  const { papers, loading, error, totalSize } = useDatabaseData();
  
  // Use the refactored hook that doesn't need state setters
  const paperOps = usePaperOperations(papers);
  const { handleCopyToClipboard } = useCopyToClipboard();
  
  // Modal states
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [showAbstractModal, setShowAbstractModal] = useState(false);
  const [showCitationModal, setShowCitationModal] = useState(false);

  const handleShowAbstract = (paper: Paper) => {
    setSelectedPaper(paper);
    setShowAbstractModal(true);
  };

  const handleShowCitation = (paper: Paper) => {
    setSelectedPaper(paper);
    setShowCitationModal(true);
  };

  const handleFindPapers = () => {
    navigate('/new-report');
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="h-8 w-8" />
        <span className="ml-2">Loading papers...</span>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load papers: {error.message}
          <button 
            className="block mt-2 underline"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  // Render empty state
  if (papers.length === 0) {
    return <EmptyState type="papers" onActionClick={handleFindPapers} />;
  }

  // Render papers table
  return (
    <div className="h-full flex flex-col">
      <PapersHeader 
        papersCount={papers.length}
        totalSize={totalSize}
        hasPdfDownloads={papers.some(paper => paper.pdfDownloaded)}
        onDeleteAllPapers={paperOps.confirmDeleteAllPapers}
        onDeleteAllPdfs={paperOps.confirmDeleteAllPdfs}
      />
      
      <div className="flex-1 overflow-auto min-h-0">
        <PapersDataTable 
          papers={papers}
          onDelete={(paper: Paper) => paperOps.confirmDeletePaper(paper.id)}
          onView={paperOps.handleViewPdf}
          onDownload={paperOps.handleDownloadPdf}
          onRemove={paperOps.confirmRemovePdf}
          onCopy={handleCopyToClipboard}
          onShowAbstract={handleShowAbstract}
          onShowCitation={handleShowCitation}
          isPaperLoading={paperOps.isPaperLoading}
        />
      </div>
      
      {/* Confirmation dialogs */}
      <DeleteConfirmationDialog
        open={paperOps.showDeleteConfirmation}
        onOpenChange={paperOps.setShowDeleteConfirmation}
        title="Delete Paper"
        description="Are you sure you want to delete this paper? This action cannot be undone."
        onConfirm={paperOps.handleDeletePaper}
      />
      
      <DeleteConfirmationDialog
        open={paperOps.showDeleteAllConfirmation}
        onOpenChange={paperOps.setShowDeleteAllConfirmation}
        title="Delete All Papers"
        description="Are you sure you want to delete all papers? This action cannot be undone."
        onConfirm={paperOps.handleDeleteAllPapers}
      />
      
      <DeleteConfirmationDialog
        open={paperOps.showDeleteAllPdfsConfirmation}
        onOpenChange={paperOps.setShowDeleteAllPdfsConfirmation}
        title="Delete All PDFs"
        description="Are you sure you want to delete all downloaded PDFs? The papers will remain in your library."
        onConfirm={paperOps.handleDeleteAllPdfs}
      />
      
      <DeleteConfirmationDialog
        open={paperOps.showRemovePdfConfirmation}
        onOpenChange={paperOps.setShowRemovePdfConfirmation}
        title="Remove PDF"
        description="Are you sure you want to remove this PDF? You can download it again later."
        confirmLabel="Remove"
        onConfirm={paperOps.handleRemovePdf}
      />
      
      <ContentModal 
        paper={selectedPaper}
        open={showAbstractModal}
        onOpenChange={setShowAbstractModal}
        onCopy={handleCopyToClipboard}
        contentType="abstract"
      />
      
      <ContentModal 
        paper={selectedPaper}
        open={showCitationModal}
        onOpenChange={setShowCitationModal}
        onCopy={handleCopyToClipboard}
        contentType="citation"
      />
    </div>
  );
} 