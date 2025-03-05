import { useNavigate } from 'react-router-dom';

// Custom hooks
import { useDatabaseData } from '@/hooks/useDatabaseData';
import { useReportOperations } from '@/hooks/useReportOperations';

// Components
import { EmptyState } from '@/components/common/EmptyState';
import { ReportsTable } from '@/components/reports/ReportsTable';
import { ReportsHeader } from '@/components/reports/ReportsHeader';
import { Loader } from '@/components/ui/loader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/common/DeleteConfirmationDialog';

/**
 * ReportsPage component for displaying and managing reports
 */
export default function ReportsPage() {
  const navigate = useNavigate();
  
  // Get data reactively from the database
  const { reports, loading, error } = useDatabaseData();
  
  // Use the refactored hook that doesn't need state setters
  const reportOps = useReportOperations();

  const handleCreateReport = () => {
    navigate('/new-report');
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="h-8 w-8" />
        <span className="ml-2">Loading reports...</span>
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
          Failed to load reports: {error.message}
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
  if (reports.length === 0) {
    return <EmptyState type="reports" onActionClick={handleCreateReport} />;
  }

  // Render reports table
  return (
    <div className="h-full flex flex-col">
      <ReportsHeader 
        reportsCount={reports.length}
        onDeleteAllReports={reportOps.confirmDeleteAllReports}
      />
      
      <div className="flex-1 overflow-auto min-h-0">
        <ReportsTable 
          reports={reports}
          onView={reportOps.handleViewReport}
          onDelete={reportOps.confirmDeleteReport}
        />
      </div>

      {/* Confirmation dialogs */}
      <DeleteConfirmationDialog
        open={reportOps.showDeleteConfirmation}
        onOpenChange={reportOps.setShowDeleteConfirmation}
        title="Delete Report"
        description="Are you sure you want to delete this report? This action cannot be undone."
        onConfirm={reportOps.handleDeleteReport}
      />
      
      <DeleteConfirmationDialog
        open={reportOps.showDeleteAllConfirmation}
        onOpenChange={reportOps.setShowDeleteAllConfirmation}
        title="Delete All Reports"
        description="Are you sure you want to delete all your reports? This action cannot be undone."
        onConfirm={reportOps.handleDeleteAllReports}
      />
    </div>
  );
} 