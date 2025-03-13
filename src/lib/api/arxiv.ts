// params = {
//   'search_query': query,
//   'start': 0,
//   'max_results': max_results,
//   'sortBy': 'relevance',
//   'sortOrder': 'descending'
// }

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
  private lastRequestTime: number = 0;
  private minRequestInterval = 3000; // 3 seconds between requests

  constructor() {
    super('https://export.arxiv.org/api/query');
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
  }

  private async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
  }

  private buildSearchUrl(params: ArxivSearchParams): string {
    const queryParams = new URLSearchParams();
    
    // Format the search query
    queryParams.append('search_query', params.query);
    
    // Add optional parameters
    if (params.start !== undefined) {
      queryParams.append('start', params.start.toString());
    }
    
    // Always include max_results, defaulting to 150 if not specified
    const maxResults = (params.maxResults || 150).toString();
    queryParams.append('max_results', maxResults);
    
    // Map our sort parameters to arXiv's format
    if (params.sortBy) {
      let sortKey = '';
      switch (params.sortBy) {
        case 'relevance':
          sortKey = 'relevance';
          break;
        case 'lastUpdatedDate':
          sortKey = 'lastUpdatedDate';
          break;
        case 'submittedDate':
          sortKey = 'submittedDate';
          break;
      }
      queryParams.append('sortBy', sortKey);
      
      if (params.sortOrder) {
        queryParams.append('sortOrder', 
          params.sortOrder === 'ascending' ? 'ascending' : 'descending'
        );
      }
    }
    
    const url = `${this.baseUrl}?${queryParams.toString()}`;
    console.log('ArXiv API URL:', url);
    console.log('Search params:', params);
    return url;
  }

  /**
   * Search for papers on arXiv
   */
  public async search(params: ArxivSearchParams): Promise<ArxivSearchResponse> {
    await this.enforceRateLimit();
    
    try {
      // First request: Get first 100 results
      const firstBatchParams = { ...params, start: 0, maxResults: 100 };
      const firstUrl = this.buildSearchUrl(firstBatchParams);
      const firstResponse = await fetch(firstUrl);
      
      if (!firstResponse.ok) {
        throw new Error(`ArXiv API error: ${firstResponse.status} ${firstResponse.statusText}`);
      }
      
      const firstXmlData = await firstResponse.text();
      const firstBatch = this.parseResponse(firstXmlData);
      
      // If we want more than 100 results and there are more available, get the next batch
      if ((params.maxResults || 150) > 100 && firstBatch.totalResults > 100) {
        // Wait for rate limit before second request
        await this.enforceRateLimit();
        
        // Second request: Get next 50 results
        const secondBatchParams = { ...params, start: 100, maxResults: 50 };
        const secondUrl = this.buildSearchUrl(secondBatchParams);
        const secondResponse = await fetch(secondUrl);
        
        if (!secondResponse.ok) {
          throw new Error(`ArXiv API error: ${secondResponse.status} ${secondResponse.statusText}`);
        }
        
        const secondXmlData = await secondResponse.text();
        const secondBatch = this.parseResponse(secondXmlData);
        
        // Combine the results
        const combinedResponse: ArxivSearchResponse = {
          papers: [...firstBatch.papers, ...secondBatch.papers],
          totalResults: firstBatch.totalResults,
          startIndex: firstBatch.startIndex,
          itemsPerPage: firstBatch.papers.length + secondBatch.papers.length
        };
        
        console.log('ArXiv API combined response:', {
          totalResults: combinedResponse.totalResults,
          returnedResults: combinedResponse.papers.length,
          firstBatchSize: firstBatch.papers.length,
          secondBatchSize: secondBatch.papers.length
        });
        
        return combinedResponse;
      }
      
      // If we only need the first batch, return it
      console.log('ArXiv API response:', {
        totalResults: firstBatch.totalResults,
        returnedResults: firstBatch.papers.length,
        startIndex: firstBatch.startIndex,
        itemsPerPage: firstBatch.itemsPerPage
      });
      
      return firstBatch;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`ArXiv search failed: ${error.message}`);
      }
      throw new Error('ArXiv search failed with unknown error');
    }
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
    
    // Get author affiliations if present
    const authorAffiliations = Array.isArray(entry.author)
      ? entry.author.map(author => author['arxiv:affiliation']).filter(Boolean)
      : entry.author?.['arxiv:affiliation']
        ? [entry.author['arxiv:affiliation']]
        : [];
    
    const publishedDate = entry.published || '';
    const year = publishedDate.substring(0, 4);
    const submittedDate = publishedDate;
    const lastUpdatedDate = entry.updated || undefined;
    
    const links = Array.isArray(entry.link) ? entry.link : [entry.link];
    const pdfLink = links.find((link) => link['@_title'] === 'pdf');
    const pdfUrl = pdfLink ? ensureHttps(pdfLink['@_href']) : '';
    
    const abstractLink = links.find((link) => link['@_rel'] === 'alternate');
    const abstractUrl = abstractLink ? ensureHttps(abstractLink['@_href']) : '';
    const arxivId = abstractUrl.split('/').pop() || '';
    
    const doiLink = links.find((link) => link['@_title'] === 'doi');
    const doi = doiLink ? doiLink['@_href'].replace('http://dx.doi.org/', '') : undefined;
    
    // Get primary category and all categories
    const primaryCategory = entry['arxiv:primary_category'] 
      ? {
          term: entry['arxiv:primary_category']['@_term'],
          scheme: entry['arxiv:primary_category']['@_scheme']
        }
      : undefined;
    
    const categories = entry.category
      ? (Array.isArray(entry.category) ? entry.category : [entry.category])
          .map(cat => ({
            term: cat['@_term'],
            scheme: cat['@_scheme']
          }))
      : undefined;
    
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
      submittedDate,
      lastUpdatedDate,
      abstractUrl,
      pdfUrl,
      arxivId,
      doi,
      bibtex,
      // Add new fields from XML
      primaryCategory,
      categories,
      comments: entry['arxiv:comment'],
      journalRef: entry['arxiv:journal_ref'],
      authorAffiliations,
      // Keep existing fields
      source: 'arxiv' as const,
      lastEnriched: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
} 