import { XMLParser } from 'fast-xml-parser';
import { BaseAPIClient } from './base';
import type { Paper } from '../db/schema/paper';
import type { ArxivSearchParams, ArxivSearchResponse, ArxivFeed, ArxivEntry } from '../services/arxiv/types';
import { generateUUID } from '../utils/id/uuid';
import { ensureHttps } from '../utils/network/url';

/**
 * ArXiv API client
 */
export class ArxivAPIClient extends BaseAPIClient {
  private parser: XMLParser;

  constructor() {
    super('https://export.arxiv.org/api/query');
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
  }

  /**
   * Search for papers on arXiv
   */
  public async search(params: ArxivSearchParams): Promise<ArxivSearchResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('search_query', params.query);
    
    if (params.start !== undefined) {
      queryParams.append('start', params.start.toString());
    }
    
    if (params.maxResults !== undefined) {
      queryParams.append('max_results', params.maxResults.toString());
    }
    
    if (params.sortBy) {
      queryParams.append('sortBy', params.sortBy);
      
      if (params.sortOrder) {
        queryParams.append('sortOrder', params.sortOrder);
      }
    }

    const xmlData = await this.withRetry(() => 
      this.request<string>(`?${queryParams.toString()}`)
    );

    return this.parseResponse(xmlData);
  }

  /**
   * Download PDF from arXiv
   */
  public async downloadPdf(pdfUrl: string): Promise<Blob> {
    const httpsUrl = ensureHttps(pdfUrl);
    return this.withRetry(() => 
      this.request<Blob>(httpsUrl, { 
        headers: { Accept: 'application/pdf' }
      })
    );
  }

  /**
   * Parse arXiv API XML response
   */
  private parseResponse(xmlData: string): ArxivSearchResponse {
    const result = this.parser.parse(xmlData);
    const feed = result.feed as ArxivFeed;
    
    const totalResults = parseInt(feed['opensearch:totalResults'] || '0');
    const startIndex = parseInt(feed['opensearch:startIndex'] || '0');
    const itemsPerPage = parseInt(feed['opensearch:itemsPerPage'] || '0');
    
    const entries = Array.isArray(feed.entry) ? feed.entry : feed.entry ? [feed.entry] : [];
    const papers = entries.map(this.entryToPaper);
    
    return {
      papers,
      totalResults,
      startIndex,
      itemsPerPage,
    };
  }

  /**
   * Convert arXiv entry to Paper object
   */
  private entryToPaper(entry: ArxivEntry): Paper {
    const authors = Array.isArray(entry.author) 
      ? entry.author.map((author) => author.name) 
      : entry.author 
        ? [entry.author.name] 
        : [];
    
    const publishedDate = entry.published || '';
    const year = publishedDate.substring(0, 4);
    
    const links = Array.isArray(entry.link) ? entry.link : [entry.link];
    const pdfLink = links.find((link) => link['@_title'] === 'pdf');
    const pdfUrl = pdfLink ? ensureHttps(pdfLink['@_href']) : '';
    
    const abstractLink = links.find((link) => link['@_rel'] === 'alternate');
    const abstractUrl = abstractLink ? ensureHttps(abstractLink['@_href']) : '';
    const arxivId = abstractUrl.split('/').pop() || '';
    
    const doiLink = links.find((link) => link['@_title'] === 'doi');
    const doi = doiLink ? doiLink['@_href'].replace('http://dx.doi.org/', '') : undefined;
    
    const authorList = authors.map(author => author.split(' ').pop()).join(' and ');
    const bibtex = `@article{${arxivId},
  title={${entry.title || ''}},
  author={${authorList}},
  journal={arXiv preprint arXiv:${arxivId}},
  year={${year}},
  url={${abstractUrl}}${doi ? `,\n  doi={${doi}}` : ''}
}`;
    
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
  }
} 