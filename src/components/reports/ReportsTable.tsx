import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils/formatting/date';
import { type Report } from '@/types';
import { Trash, Eye } from 'lucide-react';

type ReportsTableProps = {
  reports: Report[];
  onView: (id: string) => void;
  onDelete: (id: string) => void;
};

/**
 * ReportsTable component for displaying reports in a table format
 */
export function ReportsTable({ reports, onView, onDelete }: ReportsTableProps) {
  return (
    <div className="border rounded-md mt-4 w-full">
      <div className="overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Papers</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map(report => (
              <TableRow key={report.id}>
                <TableCell>
                  <div className="line-clamp-2 font-medium">{report.title}</div>
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(report.createdAt)}
                </TableCell>
                <TableCell className="text-sm">
                  {report.paperIds?.length || 0} papers
                </TableCell>
                <TableCell>
                  <div className="flex justify-center space-x-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => onView(report.id!)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View Report</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => onDelete(report.id!)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete Report</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 