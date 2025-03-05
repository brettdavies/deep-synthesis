import React, { useState } from 'react';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { Paper } from '@/lib/db/schema/paper';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatFileSize } from '@/lib/utils/formatting/size';
import { Download, Trash, Copy, ExternalLink, X, ArrowUp, ArrowDown, ArrowUpDown, Eye } from 'lucide-react';

export type PapersDataTableProps = {
  papers: Paper[];
  onDelete: (paper: Paper) => void;
  onView: (paper: Paper) => void;
  onDownload: (paper: Paper) => void;
  onRemove: (paper: Paper) => void;
  onCopy: (text: string) => void;
  onShowAbstract: (paper: Paper) => void;
  onShowCitation: (paper: Paper) => void;
  isPaperLoading: (id: string) => boolean;
};

export function PapersDataTable({
  papers,
  onDelete,
  onView,
  onDownload,
  onRemove,
  onCopy,
  onShowAbstract,
  onShowCitation,
  isPaperLoading,
}: PapersDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'title', desc: false }
  ]);

  // Define the table columns
  const columns: ColumnDef<Paper>[] = [
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="group px-0 font-semibold hover:bg-transparent"
        >
          Title
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-1 h-4 w-4 text-primary" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-1 h-4 w-4 text-primary" />
          ) : (
            <ArrowUpDown className="ml-1 h-4 w-4 opacity-20 group-hover:opacity-100" />
          )}
        </Button>
      ),
      cell: ({ row }) => {
        const paper = row.original;
        return (
          <div className="flex flex-col">
            <div className="font-medium max-w-xs truncate flex items-center">
              <span className="truncate">{paper.title}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      className="ml-1 inline-flex items-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopy(paper.title);
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Copy title</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex mt-1 space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="h-auto p-0 text-xs underline"
                      onClick={() => onShowAbstract(paper)}
                    >
                      Abstract
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View paper abstract</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="h-auto p-0 text-xs underline"
                      onClick={() => onShowCitation(paper)}
                    >
                      Citation
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View citation in BibTeX format</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'authors',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="group px-0 font-semibold hover:bg-transparent"
        >
          Authors
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-1 h-4 w-4 text-primary" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-1 h-4 w-4 text-primary" />
          ) : (
            <ArrowUpDown className="ml-1 h-4 w-4 opacity-20 group-hover:opacity-100" />
          )}
        </Button>
      ),
      cell: ({ row }) => {
        const paper = row.original;
        const authors = paper.authors?.join(', ') || '';
        return (
          <div className="max-w-xs truncate flex items-center">
            <span className="truncate">{authors}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className="ml-1 inline-flex items-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopy(authors);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Copy all authors</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },
    {
      accessorKey: 'year',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="group px-0 font-semibold hover:bg-transparent"
        >
          Year
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-1 h-4 w-4 text-primary" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-1 h-4 w-4 text-primary" />
          ) : (
            <ArrowUpDown className="ml-1 h-4 w-4 opacity-20 group-hover:opacity-100" />
          )}
        </Button>
      ),
      cell: ({ row }) => row.original.year,
    },
    {
      accessorKey: 'arxivId',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="group px-0 font-semibold hover:bg-transparent"
        >
          ArXiv ID
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-1 h-4 w-4 text-primary" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-1 h-4 w-4 text-primary" />
          ) : (
            <ArrowUpDown className="ml-1 h-4 w-4 opacity-20 group-hover:opacity-100" />
          )}
        </Button>
      ),
      cell: ({ row }) => {
        const paper = row.original;
        return (
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={`https://arxiv.org/abs/${paper.arxivId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-primary flex items-center"
                  >
                    {paper.arxivId} <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>Open in arXiv</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span 
                    className="inline-flex items-center cursor-pointer"
                    onClick={() => onCopy(paper.arxivId || '')}
                  >
                    <Copy className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Copy arXiv ID</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const paper = row.original;
        const isLoading = isPaperLoading(paper.id);
        
        return (
          <div className="flex justify-end gap-0 items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={isLoading}
                    onClick={() => {
                      if (paper.pdfDownloaded) {
                        onView(paper);
                      } else {
                        window.open(paper.pdfUrl, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className="h-7 w-7"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{paper.pdfDownloaded ? "View downloaded PDF" : "View PDF on arXiv"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {paper.pdfDownloaded ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={isLoading}
                      onClick={() => onRemove(paper)}
                      className="h-7 w-7"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Remove PDF</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={isLoading}
                      onClick={() => onDownload(paper)}
                      className="h-7 w-7"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Download PDF</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* PDF Size indicator */}
            <span className={`text-xs mx-1 ${
              paper.pdfDownloaded 
                ? (paper.pdfSize / 1024 / 1024 >= 5) ? 'text-red-500 font-medium' : 'text-gray-500'
                : 'text-gray-500'
            }`}>
              {paper.pdfDownloaded ? formatFileSize(paper.pdfSize) : 'N/A'}
            </span>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onDelete(paper)}
                    className="h-7 w-7 text-destructive"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete paper</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },
  ];

  // Set up the table
  const table = useReactTable({
    data: papers,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="mt-4 border rounded-md w-full">
      <div className="overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No papers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 