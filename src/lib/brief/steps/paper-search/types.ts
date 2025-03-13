// Interface for search terms
export interface SearchQuery {
  id: string;
  term: string;
  isActive: boolean;
}

export interface SearchQueryWithStatus extends SearchQuery {
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  error?: string;
}

// Import RelevancyData type
import type { RelevancyData } from '@/lib/db/schema/paper-brief';

// Interface for search results (papers)
export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  year: string;
  journal?: string;
  pdfUrl?: string;
  abstractUrl?: string;
  isSelected: boolean;
  arxivId?: string;
  relevancyScore?: number;
  relevancyData?: RelevancyData;
}

// Add sorting options
export type SortOption = 
  | 'relevancy-desc' 
  | 'relevancy-asc' 
  | 'date-desc' 
  | 'date-asc' 
  | 'title-asc' 
  | 'title-desc';

// Date constraint type
export interface DateConstraint {
  type: 'none' | 'before' | 'after' | 'between';
  beforeDate: string | null;
  afterDate: string | null;
} 