import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import type { ExportFormat } from '@/lib/utils/export/briefExport';

interface ExportFormatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFormat: (format: ExportFormat) => void;
}

export const ExportFormatDialog: React.FC<ExportFormatDialogProps> = ({
  open,
  onOpenChange,
  onSelectFormat,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Brief</DialogTitle>
          <DialogDescription>
            Choose a format to export your brief
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <Button
            variant="outline"
            className="flex flex-col items-center justify-center h-32 p-4 hover:bg-muted"
            onClick={() => onSelectFormat('md')}
          >
            <FileText className="h-10 w-10 mb-2 text-blue-500" />
            <span className="font-medium">Markdown</span>
            <span className="text-xs text-muted-foreground mt-1">.md</span>
          </Button>
          
          <Button
            variant="outline"
            className="flex flex-col items-center justify-center h-32 p-4 hover:bg-muted"
            onClick={() => onSelectFormat('pdf')}
          >
            <FileText className="h-10 w-10 mb-2 text-red-500" />
            <span className="font-medium">PDF</span>
            <span className="text-xs text-muted-foreground mt-1">.pdf</span>
          </Button>
        </div>
        <DialogFooter className="sm:justify-start">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 