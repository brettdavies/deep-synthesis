import type { Paper } from '../../db/schema/paper';

// Interface for search parameters
export interface ArxivSearchParams {
  query: string;
  start?: number;
  maxResults?: number;
  sortBy?: 'relevance' | 'lastUpdatedDate' | 'submittedDate';
  sortOrder?: 'ascending' | 'descending';
}

// Interface for search response
export interface ArxivSearchResponse {
  papers: Paper[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
}

// Interface for raw arXiv API entry
export interface ArxivEntry {
  // Core Atom fields
  id: string;               // URL to abstract page
  title: string;           // Article title
  summary: string;         // Article abstract
  published: string;       // Initial publication date
  updated: string;         // Last update date
  
  // Author information
  author: Array<{
    name: string;
    'arxiv:affiliation'?: string;
  }> | {
    name: string;
    'arxiv:affiliation'?: string;
  };
  
  // Links (PDF, DOI, etc)
  link: Array<{
    '@_href': string;      // URL
    '@_rel'?: string;      // Relationship type
    '@_title'?: string;    // Link title
    '@_type'?: string;     // MIME type
  }> | {
    '@_href': string;
    '@_rel'?: string;
    '@_title'?: string;
    '@_type'?: string;
  };
  
  // arXiv specific fields
  'arxiv:primary_category'?: {
    '@_term': string;      // Primary category identifier
    '@_scheme'?: string;   // Category scheme
  };
  'arxiv:comment'?: string;        // Author comments
  'arxiv:journal_ref'?: string;    // Journal reference
  'arxiv:doi'?: string;           // DOI if available
  category?: Array<{              // All categories
    '@_term': string;
    '@_scheme'?: string;
  }>;
}

// Interface for raw arXiv API feed
export interface ArxivFeed {
  'opensearch:totalResults': string;
  'opensearch:startIndex': string;
  'opensearch:itemsPerPage': string;
  entry: ArxivEntry[] | ArxivEntry;
} 