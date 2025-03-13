import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Paper, SortOption } from '../types';
import { calculatePaperCounts } from '../utils';
import { PaperRelevancy } from './PaperRelevancy';

interface PaperListProps {
  papers: Paper[];
  isGeneratingQueries: boolean;
  isLoading: boolean;
  sortBy: SortOption;
  minRelevancyScore: number;
  currentPage: number;
  totalPages: number;
  currentPapers: Paper[];
  onSortChange: (value: SortOption) => void;
  onRelevancyScoreChange: (value: number) => void;
  onPageChange: (page: number) => void;
  onTogglePaper: (id: string) => void;
  onCalculateRelevancy?: () => void;
  isCalculatingRelevancy?: boolean;
}

export const PaperList: React.FC<PaperListProps> = ({
  papers,
  isGeneratingQueries,
  isLoading,
  sortBy,
  minRelevancyScore,
  currentPage,
  totalPages,
  currentPapers,
  onSortChange,
  onRelevancyScoreChange,
  onPageChange,
  onTogglePaper,
  onCalculateRelevancy,
  isCalculatingRelevancy = false
}) => {
  // Calculate paper counts by relevancy bucket
  const paperCounts = calculatePaperCounts(papers);

  return (
    <div className="space-y-4">
      {/* Controls Section */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="sort-by" className="whitespace-nowrap">Sort by:</Label>
            <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
              <SelectTrigger id="sort-by" className="w-[200px]">
                <SelectValue placeholder="Relevancy (high to low)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevancy-desc">Relevancy (high to low)</SelectItem>
                <SelectItem value="relevancy-asc">Relevancy (low to high)</SelectItem>
                <SelectItem value="date-desc">Date (newest first)</SelectItem>
                <SelectItem value="date-asc">Date (oldest first)</SelectItem>
                <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                <SelectItem value="title-desc">Title (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="relevancy-score" className="whitespace-nowrap">Min relevancy:</Label>
            <Select value={minRelevancyScore.toString()} onValueChange={(value) => onRelevancyScoreChange(Number(value))}>
              <SelectTrigger id="relevancy-score" className="w-[120px]">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Any</SelectItem>
                <SelectItem value="20">20+</SelectItem>
                <SelectItem value="40">40+</SelectItem>
                <SelectItem value="60">60+</SelectItem>
                <SelectItem value="80">80+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Calculate Relevancy Scores button commented out
        {onCalculateRelevancy && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onCalculateRelevancy}
            disabled={isCalculatingRelevancy || isGeneratingQueries || isLoading || papers.length === 0}
          >
            {isCalculatingRelevancy ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Calculating relevancy...
              </>
            ) : (
              'Calculate Relevancy Scores'
            )}
          </Button>
        )}
        */}
      </div>

      {papers.length === 0 && !isGeneratingQueries && !isLoading && (
        <div className="p-8 text-center text-muted-foreground border rounded-lg">
          No papers found. Try searching with different terms.
        </div>
      )}
      
      {isGeneratingQueries && (
        <div className="p-8 text-center border rounded-lg">
          <Loader2 size={24} className="animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Generating search queries...</p>
        </div>
      )}
      
      {isLoading && (
        <div className="p-8 text-center border rounded-lg">
          <Loader2 size={24} className="animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Searching for papers...</p>
        </div>
      )}
      
      <div className="space-y-4">
        {currentPapers.map(paper => (
          <Card 
            key={paper.id}
            className={`${paper.isSelected ? 'border-primary' : ''} ${
              paper.relevancyScore === undefined ? 'opacity-70' :
              paper.relevancyScore < 20 ? 'opacity-50' : ''
            }`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <Checkbox 
                  id={`paper-${paper.id}`}
                  checked={paper.isSelected}
                  onCheckedChange={() => onTogglePaper(paper.id)}
                  className="mt-1"
                />
                
                <div className="flex-grow">
                  <CardTitle className="text-base">
                    <Label htmlFor={`paper-${paper.id}`} className="cursor-pointer">
                      {paper.title}
                    </Label>
                  </CardTitle>
                  <div className="text-sm text-muted-foreground mt-1">
                    {paper.authors.join(', ')} • {paper.year}
                    {paper.journal && ` • ${paper.journal}`}
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-2">
              <p className="text-sm line-clamp-3">{paper.abstract}</p>
              
              {paper.relevancyScore !== undefined && (
                <div className="mt-3">
                  <PaperRelevancy 
                    relevancyScore={paper.relevancyScore} 
                    relevancyData={paper.relevancyData}
                  />
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.open(paper.abstractUrl, '_blank')}
              >
                View on arXiv
              </Button>
              
              {paper.pdfUrl && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(paper.pdfUrl, '_blank')}
                >
                  View PDF
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          {Array.from({ length: totalPages }, (_, i) => (
            <Button
              key={i}
              variant={currentPage === i + 1 ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(i + 1)}
            >
              {i + 1}
            </Button>
          ))}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}; 
