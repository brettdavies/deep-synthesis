import { XMLParser } from 'fast-xml-parser';
import type { Paper } from '../../db/schema/paper';
import { generateUUID } from '../../utils/id/uuid';
import { ensureHttps } from '../../utils/network/url';
import type { ArxivSearchParams, ArxivSearchResponse, ArxivFeed, ArxivEntry } from './types';
import { apiClient } from '../../api';

/**
 * Generate a web URL for arXiv search from API query string
 * @param queryString Query string in API format
 * @returns A URL that can be used in browser to view search results on arXiv website
 */
export function getArxivSearchUrl(queryString: string): string {
  // Convert the API query format to web search format
  const webSearchQuery = queryString.replace(/\+/g, '%20');
  return `https://arxiv.org/search/?query=${encodeURIComponent(webSearchQuery)}&searchtype=all`;
}

/**
 * Search for papers on arXiv
 * @param params Search parameters
 * @returns Promise with search results
 */
export async function searchArxiv(params: ArxivSearchParams): Promise<ArxivSearchResponse> {
  try {
    const arxivClient = apiClient.getArxivClient();
    return await arxivClient.search(params);
  } catch (error) {
    console.error('Error searching arXiv:', error);
    throw error;
  }
}

/**
 * Parse arXiv API XML response
 * @param xmlData XML response from arXiv API
 * @returns Parsed search results
 */
function parseArxivResponse(xmlData: string): ArxivSearchResponse {
  // Create XML parser
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });
  
  // Parse XML to JavaScript object
  const result = parser.parse(xmlData);
  
  // Extract feed data
  const feed = result.feed as ArxivFeed;
  
  // Extract total results, start index, and items per page
  const totalResults = parseInt(feed['opensearch:totalResults'] || '0');
  const startIndex = parseInt(feed['opensearch:startIndex'] || '0');
  const itemsPerPage = parseInt(feed['opensearch:itemsPerPage'] || '0');
  
  // Extract entries (papers)
  const entries = Array.isArray(feed.entry) ? feed.entry : feed.entry ? [feed.entry] : [];
  
  // Map entries to Paper objects
  const papers: Paper[] = entries.map((entry: ArxivEntry) => {
    // Extract authors
    const authors = Array.isArray(entry.author) 
      ? entry.author.map((author) => author.name) 
      : entry.author 
        ? [entry.author.name] 
        : [];
    
    // Extract publication year from published date
    const publishedDate = entry.published || '';
    const year = publishedDate.substring(0, 4);
    
    // Extract PDF URL
    const links = Array.isArray(entry.link) ? entry.link : [entry.link];
    const pdfLink = links.find((link) => link['@_title'] === 'pdf');
    const pdfUrl = pdfLink ? ensureHttps(pdfLink['@_href']) : '';
    
    // Extract abstract URL (HTML link)
    const abstractLink = links.find((link) => link['@_rel'] === 'alternate');
    const abstractUrl = abstractLink ? ensureHttps(abstractLink['@_href']) : '';

    // Extract arXiv ID from the abstract URL
    const arxivId = abstractUrl.split('/').pop() || '';
    
    // Extract DOI if available
    const doiLink = links.find((link) => link['@_title'] === 'doi');
    const doi = doiLink ? doiLink['@_href'].replace('http://dx.doi.org/', '') : undefined;
    
    // Generate BibTeX citation
    const authorList = authors.map(author => author.split(' ').pop()).join(' and ');
    const bibtex = `@article{${arxivId},
  title={${entry.title || ''}},
  author={${authorList}},
  journal={arXiv preprint arXiv:${arxivId}},
  year={${year}},
  url={${abstractUrl}}${doi ? `,\n  doi={${doi}}` : ''}
}`;
    
    // Create Paper object
    return {
      id: generateUUID(),
      title: entry.title || '',
      abstract: entry.summary || '',
      authors,
      year,
      abstractUrl,
      pdfUrl,
      arxivId,
      doi,
      bibtex,
      source: 'arxiv' as const,
      lastEnriched: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });
  
  // Return search response
  return {
    papers,
    totalResults,
    startIndex,
    itemsPerPage,
  };
}

/**
 * Download PDF from arXiv
 * @param pdfUrl URL of the PDF to download
 * @returns Promise with PDF blob
 */
export async function downloadPdf(pdfUrl: string): Promise<Blob> {
  try {
    const arxivClient = apiClient.getArxivClient();
    return await arxivClient.downloadPdf(pdfUrl);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
} 