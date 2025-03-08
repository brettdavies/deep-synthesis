import { useNavigate } from 'react-router-dom';

// Custom hooks
import { useDatabaseData } from '@/hooks/useDatabaseData';
import { useBriefOperations } from '@/hooks/useBriefOperations';

// Components
import { EmptyState } from '@/components/common/EmptyState';
import { BriefsTable } from '@/components/briefs/BriefsTable';
import { BriefsHeader } from '@/components/briefs/BriefsHeader';
import { Loader } from '@/components/ui/loader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/common/DeleteConfirmationDialog';

/**
 * BriefsPage component for displaying and managing briefs
 */
export default function BriefsPage() {
  const navigate = useNavigate();
  
  // Get data reactively from the database
  const { briefs, loading, error } = useDatabaseData();
  
  // Use the refactored hook that doesn't need state setters
  const briefOps = useBriefOperations();

  const handleCreateBrief = () => {
    navigate('/brief/new');
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="h-8 w-8" />
        <span className="ml-2">Loading briefs...</span>
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
          Failed to load briefs: {error.message}
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
  if (briefs.length === 0) {
    return <EmptyState type="briefs" onActionClick={handleCreateBrief} />;
  }

  // Render briefs table
  return (
    <div className="h-full flex flex-col">
      <BriefsHeader 
        briefsCount={briefs.length}
        onDeleteAllBriefs={briefOps.confirmDeleteAllBriefs}
      />
      
      <div className="flex-1 overflow-auto min-h-0">
        <BriefsTable 
          briefs={briefs}
          onView={briefOps.handleViewBrief}
          onDelete={briefOps.confirmDeleteBrief}
        />
      </div>

      {/* Confirmation dialogs */}
      <DeleteConfirmationDialog
        open={briefOps.showDeleteConfirmation}
        onOpenChange={briefOps.setShowDeleteConfirmation}
        title="Delete Brief"
        description="Are you sure you want to delete this brief? This action cannot be undone."
        onConfirm={briefOps.handleDeleteBrief}
      />
      
      <DeleteConfirmationDialog
        open={briefOps.showDeleteAllConfirmation}
        onOpenChange={briefOps.setShowDeleteAllConfirmation}
        title="Delete All Briefs"
        description="Are you sure you want to delete all your briefs? This action cannot be undone."
        onConfirm={briefOps.handleDeleteAllBriefs}
      />
    </div>
  );
} 