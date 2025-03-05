import type { Table } from 'dexie';

export interface Paper {
  id: string;              // UUID v4
  arxivId: string;         // ArXiv identifier for the paper
  title: string;
  abstract: string;
  authors: string[];
  year: string;
  abstractUrl: string;
  pdfUrl: string;
  pdfChunks?: {           // PDF stored in chunks
    chunkIndex: number;
    data: Blob;
    size: number;
  }[];
  pdfSize?: number;       // Total PDF size
  pdfDownloaded?: boolean; // Whether the PDF has been downloaded
  pdfDownloadProgress?: number; // Download progress (0-100)
  // Fields for data enrichment
  doi?: string;            // DOI if available
  journal?: string;        // Journal information if published
  volume?: string;         // Volume information if published
  issue?: string;         // Issue information if published
  pages?: string;         // Page numbers if published
  publisher?: string;     // Publisher information
  citations?: number;     // Number of citations (from external source)
  bibtex?: string;       // BibTeX citation
  lastEnriched?: Date;    // When the paper was last enriched with external data
  source: 'arxiv' | 'doi' | 'crossref' | 'semantic_scholar'; // Data source
  createdAt: Date;        // When the paper was first added
  updatedAt: Date;        // When the paper was last updated
}

export type PaperTable = Table<Paper>;

export const PAPER_SCHEMA = 'id, arxivId, title, abstract, authors, year, abstractUrl, pdfDownloaded, pdfSize, doi, bibtex, source, lastEnriched, createdAt, updatedAt, *pdfChunks'; 