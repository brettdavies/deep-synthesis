import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusCircle, Trash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type ReportsHeaderProps = {
  reportsCount: number;
  onDeleteAllReports: () => void;
};

/**
 * Header component for the Reports page with actions
 */
export function ReportsHeader({ reportsCount, onDeleteAllReports }: ReportsHeaderProps) {
  const navigate = useNavigate();

  const handleCreateReport = () => {
    navigate('/new-report');
  };

  return (
    <Card className="mb-3">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold">Generated Reports ({reportsCount})</h3>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center space-x-1"
            onClick={handleCreateReport}
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Report</span>
          </Button>
          {reportsCount > 0 && (
            <Button 
              variant="destructive" 
              size="sm"
              className="flex items-center space-x-1"
              onClick={onDeleteAllReports}
            >
              <Trash className="h-4 w-4" />
              <span>Delete All</span>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
} 