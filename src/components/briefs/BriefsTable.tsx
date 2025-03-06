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
import { type Brief } from '@/lib/db/schema/brief';
import { Trash, Eye } from 'lucide-react';

type BriefsTableProps = {
  briefs: Brief[];
  onView: (id: string) => void;
  onDelete: (id: string) => void;
};

/**
 * BriefsTable component for displaying briefs in a table format
 */
export function BriefsTable({ briefs, onView, onDelete }: BriefsTableProps) {
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
            {briefs.map(brief => (
              <TableRow key={brief.id}>
                <TableCell>
                  <div className="line-clamp-2 font-medium">{brief.title}</div>
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(brief.createdAt)}
                </TableCell>
                <TableCell className="text-sm">
                  {brief.references?.length || 0} papers
                </TableCell>
                <TableCell>
                  <div className="flex justify-center space-x-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => onView(brief.id!)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View Brief</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => onDelete(brief.id!)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete Brief</TooltipContent>
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