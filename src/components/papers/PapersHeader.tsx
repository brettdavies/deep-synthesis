import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatFileSize } from '@/lib/utils/formatting/size';
import { Trash } from 'lucide-react';

type PapersHeaderProps = {
  papersCount: number;
  totalSize: number;
  hasPdfDownloads: boolean;
  onDeleteAllPapers: () => void;
  onDeleteAllPdfs: () => void;
};

/**
 * Header component for the Papers page with storage info and actions
 */
export function PapersHeader({ 
  papersCount, 
  totalSize, 
  hasPdfDownloads,
  onDeleteAllPapers, 
  onDeleteAllPdfs 
}: PapersHeaderProps) {
  return (
    <Card className="mb-3">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold">Stored Papers ({papersCount})</h3>
          <div className="text-sm text-muted-foreground">
            Storage used: {formatFileSize(totalSize)}
          </div>
        </div>
        
        <div className="flex space-x-2">
          {hasPdfDownloads && (
            <Button 
              variant="outline" 
              size="sm"
              className="text-destructive flex items-center space-x-1"
              onClick={onDeleteAllPdfs}
            >
              <Trash className="h-4 w-4" />
              <span>Delete All PDFs</span>
            </Button>
          )}
          <Button 
            variant="destructive" 
            size="sm"
            className="flex items-center space-x-1"
            onClick={onDeleteAllPapers}
          >
            <Trash className="h-4 w-4" />
            <span>Delete All Papers</span>
          </Button>
        </div>
      </div>
    </Card>
  );
} 