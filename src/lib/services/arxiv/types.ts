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
  title: string;
  summary: string;
  published: string;
  author: Array<{ name: string }> | { name: string };
  link: Array<{
    '@_href': string;
    '@_rel'?: string;
    '@_title'?: string;
  }> | {
    '@_href': string;
    '@_rel'?: string;
    '@_title'?: string;
  };
}

// Interface for raw arXiv API feed
export interface ArxivFeed {
  'opensearch:totalResults': string;
  'opensearch:startIndex': string;
  'opensearch:itemsPerPage': string;
  entry: ArxivEntry[] | ArxivEntry;
} 