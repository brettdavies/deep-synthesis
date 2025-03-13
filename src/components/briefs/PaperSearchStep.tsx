import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { ArxivAPIClient } from '@/lib/api/arxiv';
import { MessageType, sendMessage } from '@/lib/services/ai';
import { generateUUID } from '@/lib/utils/id/uuid';
import { withRetry } from '@/lib/utils/api/retry';
import { ExternalLinkIcon, XIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { Paper } from '@/lib/db/schema/paper';
import type { PaperBriefAssociation } from '@/lib/db/schema/paper-brief';

interface PaperSearchStepProps {
  briefId: string;
  onComplete: () => void;
  onBack: () => void;
}

interface SearchQuery {
  id: string;
  query: string;
  isSelected: boolean;
  status?: 'waiting' | 'processing' | 'completed' | 'failed';
  error?: string;
}

interface PaperWithMetadata extends Paper {
  isSelected: boolean;
  searchQuery: string;
  relevancyScore?: number;
}

export function PaperSearchStep({ briefId, onComplete, onBack }: PaperSearchStepProps) {
  const [searchQueries, setSearchQueries] = useState<SearchQuery[]>([]);
  const [newSearchQuery, setNewSearchQuery] = useState('');
  const [isGeneratingQueries, setIsGeneratingQueries] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isCalculatingRelevancy, setIsCalculatingRelevancy] = useState(false);
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'relevancy' | 'date'>('relevancy');
  const [minRelevancyScore, setMinRelevancyScore] = useState(80); // Default to highest bucket

  // Get the brief and its associated papers from database
  const brief = useLiveQuery(() => db.briefs.get(briefId), [briefId]);
  
  const paperAssociations = useLiveQuery(
    () => db.paperBriefAssociations
      .where('briefId')
      .equals(briefId)
      .toArray(),
    [briefId]
  );

  const papers = useLiveQuery(
    async () => {
      if (!paperAssociations) return [];
      
      const paperIds = paperAssociations.map(assoc => assoc.paperId);
      const papers = await db.papers.where('id').anyOf(paperIds).toArray();
      
      // Combine paper data with association data
      return papers.map(paper => {
        const association = paperAssociations.find(assoc => assoc.paperId === paper.id);
        return {
          ...paper,
          isSelected: association?.isSelected || false,
          searchQuery: association?.searchQuery || '',
          relevancyScore: association?.relevancyScore
        };
      });
    },
    [paperAssociations]
  );

  // Generate initial search queries when component mounts
  useEffect(() => {
    if (brief?.refinedQuery && searchQueries.length === 0) {
      generateSearchQueries();
    }
  }, [brief?.refinedQuery]);

  // Function to generate search queries using AI
  async function generateSearchQueries() {
    if (!brief?.refinedQuery) return;
    
    setIsGeneratingQueries(true);
    
    try {
      const message = {
        role: 'user' as const,
        content: `Generate 3 effective arXiv search queries for the following research topic. 
        Format each query using arXiv syntax (using field prefixes like ti:, au:, abs:, etc. with appropriate Boolean operators).
        Include date constraints if applicable.
        Research topic: ${brief.refinedQuery}
        
        Return exactly 3 queries, one per line, without explanations.`
      };
      
      const response = await sendMessage(MessageType.Brief, briefId, [message]);
      
      const newQueries = response.content
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(query => ({
          id: generateUUID(),
          query: query.trim(),
          isSelected: true,
          status: 'waiting' as const
        }));
      
      setSearchQueries(prevQueries => [...prevQueries, ...newQueries]);
    } catch (error) {
      console.error('Error generating search queries:', error);
    } finally {
      setIsGeneratingQueries(false);
    }
  }

  // Handle toggling a search query selection
  function toggleSearchQuery(id: string) {
    setSearchQueries(prevQueries => 
      prevQueries.map(query => 
        query.id === id ? { ...query, isSelected: !query.isSelected } : query
      )
    );
  }

  // Handle deleting a search query
  function deleteSearchQuery(id: string) {
    setSearchQueries(prevQueries => prevQueries.filter(query => query.id !== id));
  }

  // Handle adding a new search query
  function addSearchQuery() {
    if (newSearchQuery.trim().length === 0) return;
    
    setSearchQueries(prevQueries => [
      ...prevQueries, 
      {
        id: generateUUID(),
        query: newSearchQuery.trim(),
        isSelected: true,
        status: 'waiting'
      }
    ]);
    
    setNewSearchQuery('');
  }

  // Get API URL for a search query
  function getApiUrl(query: string): string {
    return `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(query)}`;
  }

  // Function to add date constraints to query
  function addDateConstraints(query: string, dateConstraints: any): string {
    if (dateConstraints.beforeDate) {
      const beforeDateStr = formatDateForArxiv(dateConstraints.beforeDate);
      query += ` AND submittedDate:[* TO ${beforeDateStr}]`;
    }
    
    if (dateConstraints.afterDate) {
      const afterDateStr = formatDateForArxiv(dateConstraints.afterDate);
      query += ` AND submittedDate:[${afterDateStr} TO *]`;
    }
    
    if (dateConstraints.startDate && dateConstraints.endDate) {
      const startDateStr = formatDateForArxiv(dateConstraints.startDate);
      const endDateStr = formatDateForArxiv(dateConstraints.endDate);
      query += ` AND submittedDate:[${startDateStr} TO ${endDateStr}]`;
    }
    
    return query;
  }

  // Function to format date for arXiv query
  function formatDateForArxiv(date: Date): string {
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }

  // Handle search execution
  async function executeSearch() {
    if (searchQueries.length === 0) return;
    
    const selectedQueries = searchQueries.filter(query => query.isSelected);
    if (selectedQueries.length === 0) return;
    
    setIsSearching(true);
    
    try {
      // Queue up the selected queries and process them with rate limiting
      const queryQueue = [...selectedQueries];
      const arxivClient = new ArxivAPIClient();
      let allPapers: PaperWithMetadata[] = [];
      
      // Process queries one at a time, respecting the rate limit
      for (const query of queryQueue) {
        try {
          // Update query status to processing
          setSearchQueries(prev => 
            prev.map(q => q.id === query.id ? { ...q, status: 'processing' } : q)
          );

          // Ensure date constraints are included if needed
          let searchQuery = query.query;
          
          if (brief?.dateConstraints) {
            searchQuery = addDateConstraints(searchQuery, brief.dateConstraints);
          }
          
          const response = await withRetry(() => 
            arxivClient.search({
              query: searchQuery,
              maxResults: 100,
              sortBy: 'relevance',
              sortOrder: 'descending'
            })
          );
          
          // Convert papers to PaperWithMetadata
          const papersFromSearch: PaperWithMetadata[] = response.papers.map(paper => ({
            ...paper,
            isSelected: false,
            searchQuery: query.query,
            relevancyScore: undefined
          }));
          
          allPapers = [...allPapers, ...papersFromSearch];
          
          // Update query status to completed
          setSearchQueries(prev => 
            prev.map(q => q.id === query.id ? { ...q, status: 'completed' } : q)
          );
          
          // Respect ArXiv API rate limit - wait 3 seconds between requests
          if (queryQueue.indexOf(query) < queryQueue.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } catch (error) {
          console.error(`Error processing query "${query.query}":`, error);
          // Update query status to failed
          setSearchQueries(prev => 
            prev.map(q => q.id === query.id ? { 
              ...q, 
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error'
            } : q)
          );
        }
      }
      
      // Deduplicate papers based on arxivId
      const uniquePapers = allPapers.reduce<PaperWithMetadata[]>((acc, paper) => {
        const exists = acc.some(p => p.arxivId === paper.arxivId);
        if (!exists) {
          acc.push(paper);
        }
        return acc;
      }, []);
      
      // Save papers to database
      await savePapersToDatabase(uniquePapers);
      
      // Calculate relevancy scores
      calculateRelevancyScores(uniquePapers);
    } catch (error) {
      console.error('Error executing search:', error);
    } finally {
      setIsSearching(false);
    }
  }

  // Save papers to database
  async function savePapersToDatabase(papers: PaperWithMetadata[]) {
    await db.transaction('rw', [db.papers, db.paperBriefAssociations], async () => {
      for (const paper of papers) {
        // Check if paper already exists
        const existingPaper = await db.papers.where({ arxivId: paper.arxivId }).first();
        
        if (!existingPaper) {
          // Add new paper
          await db.papers.add({
            id: paper.id,
            title: paper.title,
            abstract: paper.abstract,
            authors: paper.authors,
            year: paper.year,
            abstractUrl: paper.abstractUrl,
            pdfUrl: paper.pdfUrl,
            arxivId: paper.arxivId,
            doi: paper.doi,
            bibtex: paper.bibtex,
            source: paper.source,
            submittedDate: paper.submittedDate || paper.year,
            lastEnriched: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
        
        // Check if association already exists
        const existingAssociation = await db.paperBriefAssociations
          .where({ briefId, paperId: paper.id })
          .first();
        
        if (!existingAssociation) {
          // Add new association
          await db.paperBriefAssociations.add({
            id: generateUUID(),
            briefId,
            paperId: paper.id,
            searchQuery: [paper.searchQuery],
            isSelected: false,
            relevancyScore: paper.relevancyScore,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    });
  }

  // Calculate relevancy scores for papers
  async function calculateRelevancyScores(papers: PaperWithMetadata[]) {
    if (!brief?.refinedQuery || papers.length === 0) return;
    
    setIsCalculatingRelevancy(true);
    
    try {
      // Create batches of papers (25% of total)
      const batchSize = Math.max(1, Math.ceil(papers.length / 4));
      const batches = [];
      
      for (let i = 0; i < papers.length; i += batchSize) {
        batches.push(papers.slice(i, i + batchSize));
      }
      
      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        const message = {
          role: 'system' as const,
          content: `You are a scientific literature analysis assistant. Your task is to score the relevance of academic papers to a research question.

For each paper, assign a relevancy score from 0 to 100 where:
- 0-20: Not relevant at all
- 21-40: Slightly relevant
- 41-60: Moderately relevant
- 61-80: Highly relevant
- 81-100: Extremely relevant, directly addresses the research question

Base your scoring on how well the paper's content matches the research question.

IMPORTANT: You must return your response in this exact JSON format:
{
  "scores": [
    {"paperId": "id1", "score": 85, "justification": "one sentence explanation"},
    {"paperId": "id2", "score": 42, "justification": "one sentence explanation"},
    ...
  ]
}`
        };
        
        const userMessage = {
          role: 'user' as const,
          content: `Research question: ${brief.refinedQuery}

Papers to evaluate:
${batch.map(paper => `
ID: ${paper.id}
Title: ${paper.title}
Abstract: ${paper.abstract}
`).join('\n')}`
        };
        
        try {
          const response = await withRetry(() => 
            sendMessage(MessageType.Brief, briefId, [message, userMessage])
          );
          
          try {
            const result = JSON.parse(response.content);
            
            if (result.scores && Array.isArray(result.scores)) {
              // Update papers with relevancy scores
              await db.transaction('rw', [db.paperBriefAssociations], async () => {
                for (const { paperId, score, justification } of result.scores) {
                  await db.paperBriefAssociations
                    .where({ briefId, paperId })
                    .modify({ 
                      relevancyScore: score,
                      relevancyJustification: justification,
                      updatedAt: new Date()
                    });
                }
              });
            }
          } catch (parseError) {
            console.error('Error parsing relevancy scores:', parseError);
          }
        } catch (aiError) {
          console.error('Error calculating relevancy scores for batch:', aiError);
        }
      }
    } catch (error) {
      console.error('Error calculating relevancy scores:', error);
    } finally {
      setIsCalculatingRelevancy(false);
    }
  }

  // Toggle paper selection
  async function togglePaperSelection(paperId: string) {
    try {
      await db.transaction('rw', [db.paperBriefAssociations], async () => {
        const association = await db.paperBriefAssociations
          .where({ briefId, paperId })
          .first();
        
        if (association) {
          await db.paperBriefAssociations.update(association.id, {
            isSelected: !association.isSelected,
            updatedAt: new Date()
          });
        }
      });
    } catch (error) {
      console.error('Error toggling paper selection:', error);
    }
  }

  // Filter and sort papers
  const filteredPapers = papers
    ?.filter(paper => paper.relevancyScore === undefined || paper.relevancyScore >= minRelevancyScore)
    .sort((a, b) => {
      if (sortBy === 'relevancy') {
        // Sort by relevancy score (highest first), handling undefined scores
        if (a.relevancyScore === undefined && b.relevancyScore === undefined) {
          return 0;
        }
        if (a.relevancyScore === undefined) return 1;
        if (b.relevancyScore === undefined) return -1;
        return b.relevancyScore - a.relevancyScore;
      } else {
        // Sort by date (newest first)
        return parseInt(b.year) - parseInt(a.year);
      }
    }) || [];

  // Calculate paper counts by relevancy bucket
  const paperCounts = papers?.reduce((acc, paper) => {
    if (paper.relevancyScore === undefined) {
      acc.unscored = (acc.unscored || 0) + 1;
    } else if (paper.relevancyScore >= 80) {
      acc['80-100'] = (acc['80-100'] || 0) + 1;
    } else if (paper.relevancyScore >= 60) {
      acc['60-79'] = (acc['60-79'] || 0) + 1;
    } else if (paper.relevancyScore >= 40) {
      acc['40-59'] = (acc['40-59'] || 0) + 1;
    } else if (paper.relevancyScore >= 20) {
      acc['20-39'] = (acc['20-39'] || 0) + 1;
    } else {
      acc['0-19'] = (acc['0-19'] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="paper-search-step">
      <h2 className="text-2xl font-bold mb-4">Search for Papers</h2>
      <p className="mb-6">
        Search for relevant papers to include in your brief. You can use multiple search queries and select the papers that best match your research question.
      </p>
      
      <div className="search-queries-section mb-8">
        <h3 className="text-lg font-semibold mb-2">Search Queries</h3>
        <div className="search-queries-list space-y-2 mb-4">
          {searchQueries.map(query => (
            <div 
              key={query.id} 
              className={`flex items-center space-x-2 p-2 border rounded ${
                query.status === 'processing' ? 'bg-blue-50' :
                query.status === 'completed' ? 'bg-green-50' :
                query.status === 'failed' ? 'bg-red-50' :
                'bg-white'
              }`}
            >
              <Checkbox 
                checked={query.isSelected} 
                onCheckedChange={() => toggleSearchQuery(query.id)} 
                id={`query-${query.id}`}
              />
              <label 
                htmlFor={`query-${query.id}`}
                className="flex-grow cursor-pointer"
              >
                {query.query}
                {query.status === 'failed' && (
                  <span className="text-sm text-red-600 ml-2">
                    Error: {query.error}
                  </span>
                )}
              </label>
              <a 
                href={getApiUrl(query.query)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700"
                title="View API results"
              >
                <ExternalLinkIcon size={16} />
              </a>
              <button 
                onClick={() => deleteSearchQuery(query.id)}
                className="text-red-500 hover:text-red-700"
                title="Delete query"
              >
                <XIcon size={16} />
              </button>
            </div>
          ))}
          
          {searchQueries.length === 0 && (
            <p className="text-gray-500 italic">No search queries yet. Generate some or add your own.</p>
          )}
        </div>
        
        <div className="flex items-center space-x-2 mb-4">
          <Input
            value={newSearchQuery}
            onChange={e => setNewSearchQuery(e.target.value)}
            placeholder="Add a new search query..."
            className="flex-grow"
            onKeyDown={e => e.key === 'Enter' && addSearchQuery()}
          />
          <Button onClick={addSearchQuery} variant="secondary" size="sm">
            <PlusIcon size={16} className="mr-1" />
            Add
          </Button>
        </div>
        
        <Button 
          onClick={generateSearchQueries} 
          variant="outline" 
          disabled={isGeneratingQueries}
          className="mb-4"
        >
          {isGeneratingQueries ? 'Generating...' : 'Generate More Search Queries'}
        </Button>
        
        <Button 
          onClick={executeSearch} 
          disabled={isSearching || searchQueries.filter(q => q.isSelected).length === 0}
          className="w-full"
        >
          {isSearching ? 'Searching...' : 'Search'}
        </Button>
      </div>
      
      <div className="search-results-section">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Search Results
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {filteredPapers.length} papers found
            </span>
          </h3>
          
          <div className="flex items-center space-x-4">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'relevancy' | 'date')}
              className="border rounded px-2 py-1"
            >
              <option value="relevancy">Sort by Relevancy</option>
              <option value="date">Sort by Date</option>
            </select>
            
            <select
              value={minRelevancyScore}
              onChange={e => setMinRelevancyScore(parseInt(e.target.value))}
              className="border rounded px-2 py-1"
            >
              <option value={80}>80-100 ({paperCounts['80-100'] || 0})</option>
              <option value={60}>60-79 ({paperCounts['60-79'] || 0})</option>
              <option value={40}>40-59 ({paperCounts['40-59'] || 0})</option>
              <option value={20}>20-39 ({paperCounts['20-39'] || 0})</option>
              <option value={0}>0-19 ({paperCounts['0-19'] || 0})</option>
            </select>
          </div>
        </div>
        
        {isCalculatingRelevancy && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Calculating relevancy scores...</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-primary h-2.5 rounded-full" 
                style={{ width: `${Math.min(100, (papers?.filter(p => p.relevancyScore !== undefined).length || 0) / (papers?.length || 1) * 100)}%` }}
              ></div>
            </div>
          </div>
        )}
        
        <div className="search-results space-y-4">
          {filteredPapers.length > 0 ? (
            <>
              {filteredPapers.map(paper => (
                <div 
                  key={paper.id} 
                  className={`paper-item border rounded p-4 hover:bg-gray-50 transition-colors ${
                    paper.relevancyScore === undefined ? 'opacity-70' :
                    paper.relevancyScore < 20 ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start">
                    <Checkbox 
                      checked={paper.isSelected}
                      onCheckedChange={() => togglePaperSelection(paper.id)}
                      id={`paper-${paper.id}`}
                      className="mt-1 mr-3"
                    />
                    
                    {paper.relevancyScore !== undefined && (
                      <div 
                        className={`relevancy-badge min-w-[80px] text-center text-sm px-2 py-1 mr-3 rounded ${
                          paper.relevancyScore >= 80 ? 'bg-green-100 text-green-800' :
                          paper.relevancyScore >= 60 ? 'bg-blue-100 text-blue-800' :
                          paper.relevancyScore >= 40 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}
                      >
                        {paper.relevancyScore}%
                      </div>
                    )}
                    
                    <div className="flex-grow">
                      <h4 className="font-medium">{paper.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {paper.authors.join(', ')} ({paper.year})
                      </p>
                      
                      <div className="flex items-center space-x-4 mt-2">
                        <a 
                          href={paper.abstractUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View on arXiv
                        </a>
                        
                        <a 
                          href={paper.pdfUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Download PDF
                        </a>
                      </div>
                      
                      <p className="mt-2 text-sm line-clamp-3">
                        {paper.abstract}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <p className="text-center py-12 text-muted-foreground">
              No papers found. Try searching with different queries.
            </p>
          )}
        </div>
      </div>
      
      <div className="flex justify-between mt-8">
        <Button onClick={onBack} variant="outline">Back</Button>
        <Button 
          onClick={onComplete} 
          disabled={selectedPaperIds.length === 0}
        >
          Continue with {selectedPaperIds.length} papers
        </Button>
      </div>
    </div>
  );
} 