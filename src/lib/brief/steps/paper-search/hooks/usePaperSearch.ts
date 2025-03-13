import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import { ArxivAPIClient } from '@/lib/api/arxiv';
import { withRetry } from '@/lib/utils/api/retry';
import { generateUUID } from '@/lib/utils/id/uuid';
import toast from 'react-hot-toast';
import type { Brief } from '@/lib/db/schema/brief';
import type { Paper, SearchQueryWithStatus, DateConstraint, SortOption } from '../types';
import { addDateConstraints } from '../utils';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRelevancyScoring } from './useRelevancyScoring';

// Number of results per page
const RESULTS_PER_PAGE = 10;

export const usePaperSearch = (
  briefId: string, 
  brief: Brief | null, 
  searchTerms: SearchQueryWithStatus[],
  setSearchTerms: React.Dispatch<React.SetStateAction<SearchQueryWithStatus[]>>,
  aiDateConstraint: DateConstraint | null,
  handleError: (error: any) => void
) => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPapers, setSelectedPapers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('relevancy-desc');
  const [minRelevancyScore, setMinRelevancyScore] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Get relevancy scoring functionality
  const { 
    calculateAndSaveRelevancyScores, 
    isCalculating: isCalculatingRelevancy,
    progress: relevancyProgress
  } = useRelevancyScoring(briefId, brief);

  // Function to load papers from database - memoized to prevent recreating on each render
  const loadPapersFromDatabase = useCallback(async () => {
    try {
      // Get all paper associations for this brief
      const associations = await db.paperBriefAssociations
        .where('briefId')
        .equals(briefId)
        .toArray();

      if (associations.length > 0) {
        // Get all paper IDs
        const paperIds = associations.map(assoc => assoc.paperId);
        
        // Get all papers
        const papers = await db.papers
          .where('id')
          .anyOf(paperIds)
          .toArray();

        // Map papers to include isSelected state from associations
        const papersWithSelection = papers.map(paper => {
          const association = associations.find(assoc => assoc.paperId === paper.id);
          return {
            ...paper,
            isSelected: association?.isSelected || false,
            relevancyScore: association?.relevancyScore,
            relevancyData: association?.relevancyData,
            abstractUrl: paper.arxivId ? `https://arxiv.org/abs/${paper.arxivId}` : undefined
          };
        });

        // Update papers state and selected papers
        setPapers(papersWithSelection);
        setSelectedPapers(
          papersWithSelection
            .filter(paper => paper.isSelected)
            .map(paper => paper.id)
        );

        console.log('Loaded papers from database:', papersWithSelection);
      }
    } catch (error) {
      console.error('Error loading papers from database:', error);
      handleError(error);
    }
  }, [briefId, handleError]);

  // Load papers from database when component mounts
  useEffect(() => {
    if (briefId) {
      loadPapersFromDatabase();
    }
  }, [briefId, loadPapersFromDatabase]);
  
  // Reset to first page when sorting or filtering changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, minRelevancyScore]);

  // Handle paper selection
  const handleTogglePaper = async (paperId: string) => {
    try {
      // Update UI state
      setPapers(prev => 
        prev.map(paper => 
          paper.id === paperId ? { ...paper, isSelected: !paper.isSelected } : paper
        )
      );
      
      setSelectedPapers(prev => {
        if (prev.includes(paperId)) {
          return prev.filter(id => id !== paperId);
        } else {
          return [...prev, paperId];
        }
      });

      // Get the current paper's selection state
      const paper = papers.find(p => p.id === paperId);
      const newIsSelected = !paper?.isSelected;

      // Update the association in the database
      await db.transaction('rw', [db.paperBriefAssociations], async () => {
        const association = await db.paperBriefAssociations
          .where({
            briefId,
            paperId
          })
          .first();

        if (association) {
          await db.paperBriefAssociations.update(association.id, {
            isSelected: newIsSelected,
            updatedAt: new Date()
          });
          console.log('Updated paper selection in database:', { paperId, isSelected: newIsSelected });
        } else {
          // If no association exists, create one
          const newAssociation = {
            id: generateUUID(),
            briefId,
            paperId,
            isSelected: newIsSelected,
            searchQuery: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };
          await db.paperBriefAssociations.add(newAssociation);
          console.log('Created new paper association in database:', newAssociation);
        }
      });

    } catch (error) {
      console.error('Error updating paper selection:', error);
      handleError(error);
      // Revert UI state on error
      setPapers(prev => 
        prev.map(paper => 
          paper.id === paperId ? { ...paper, isSelected: !paper.isSelected } : paper
        )
      );
      setSelectedPapers(prev => 
        prev.includes(paperId) 
          ? prev.filter(id => id !== paperId)
          : [...prev, paperId]
      );
      toast.error('Failed to update paper selection');
    }
  };
  
  // Handle searching for papers
  const handleSearch = async () => {
    const activeTerms = searchTerms.filter(term => term.isActive);
    
    if (activeTerms.length === 0) {
      toast.error("Please add at least one active search query");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Clear previous results
      setPapers([]);
      setSelectedPapers([]);
      
      const arxivClient = new ArxivAPIClient();
      const processedPapers = new Set<string>(); // Track papers by arxivId
      
      // Process each active term sequentially
      for (const term of activeTerms) {
        try {
          // Update term status to processing (only in UI state)
          const updatedTerms = searchTerms.map(t => 
            t.id === term.id 
              ? { ...t, status: 'processing' as const, error: undefined }
              : t
          );
          setSearchTerms(updatedTerms);
          
          // Add date constraints to query
          const searchQuery = addDateConstraints(term.term, aiDateConstraint, brief || undefined);
          console.log('Final search query with date constraints:', searchQuery);
          
          // Search arXiv with retry logic
          const response = await withRetry(() => 
            arxivClient.search({
              query: searchQuery,
              maxResults: 100,
              sortBy: 'relevance',
              sortOrder: 'descending'
            })
          );
          
          // Filter out duplicates and add new papers
          const newPapers = response.papers.filter(paper => {
            if (processedPapers.has(paper.arxivId)) {
              return false;
            }
            processedPapers.add(paper.arxivId);
            return true;
          });
          
          // Save papers to database
          await db.transaction('rw', [db.papers, db.paperBriefAssociations], async () => {
            for (const paper of newPapers) {
              // Check if paper already exists
              const existingPaper = await db.papers.where({ arxivId: paper.arxivId }).first();
              
              if (!existingPaper) {
                await db.papers.add(paper);
              }
              
              // Create or update association
              const association = {
                id: generateUUID(),
                briefId,
                paperId: paper.id,
                searchQuery: [term.term],
                isSelected: false,
                createdAt: new Date(),
                updatedAt: new Date()
              };
              
              await db.paperBriefAssociations.put(association);
            }
          });
          
          // Add papers to UI state - merge with existing papers
          setPapers(prev => {
            const newPapersMap = new Map(newPapers.map(p => [p.id, { 
              ...p, 
              isSelected: false,
              relevancyScore: undefined // Will be set later by calculateRelevancyScores
            }]));
            const existingPapers = prev.filter(p => !newPapersMap.has(p.id));
            return [...existingPapers, ...newPapersMap.values()];
          });
          
          // Update term status to completed (only in UI state)
          const completedTerms = searchTerms.map(t => 
            t.id === term.id 
              ? { ...t, status: 'completed' as const }
              : t
          );
          setSearchTerms(completedTerms);
          
        } catch (error) {
          // Update term status to failed (only in UI state)
          const failedTerms = searchTerms.map(t => 
            t.id === term.id 
              ? { 
                  ...t, 
                  status: 'failed' as const, 
                  error: error instanceof Error ? error.message : 'Search failed'
                }
              : t
          );
          setSearchTerms(failedTerms);
          
          console.error(`Error searching term "${term.term}":`, error);
        }
      }
      
      const totalFound = processedPapers.size;
      toast.success(`Found ${totalFound} unique papers`);
    } catch (error) {
      console.error('Error during search:', error);
      toast.error("Search failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate relevancy scores for all papers
  const handleCalculateRelevancy = async () => {
    if (!brief || papers.length === 0) return;
    
    try {
      await calculateAndSaveRelevancyScores(papers);
      
      // Reload papers to get updated relevancy scores
      await loadPapersFromDatabase();
      
      // Reset to first page and sort by relevancy
      setCurrentPage(1);
      setSortBy('relevancy-desc');
    } catch (error) {
      console.error('Error calculating relevancy scores:', error);
      handleError(error);
    }
  };

  // Sort and filter papers
  const getSortedAndFilteredPapers = useCallback(() => {
    const filteredPapers = minRelevancyScore > 0
      ? papers.filter(paper => (paper.relevancyScore || 0) >= minRelevancyScore)
      : papers;
    
    return [...filteredPapers].sort((a, b) => {
      switch (sortBy) {
        case 'relevancy-desc':
          return (b.relevancyScore || 0) - (a.relevancyScore || 0);
        case 'relevancy-asc':
          return (a.relevancyScore || 0) - (b.relevancyScore || 0);
        case 'date-desc':
          return b.year.localeCompare(a.year);
        case 'date-asc':
          return a.year.localeCompare(b.year);
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });
  }, [papers, sortBy, minRelevancyScore]);

  // Get paginated papers
  const getPaginatedPapers = useCallback(() => {
    const sortedPapers = getSortedAndFilteredPapers();
    const totalPages = Math.max(1, Math.ceil(sortedPapers.length / RESULTS_PER_PAGE));
    
    // Adjust current page if it's out of bounds
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
    
    const startIndex = (currentPage - 1) * RESULTS_PER_PAGE;
    const endIndex = startIndex + RESULTS_PER_PAGE;
    
    return {
      papers: sortedPapers.slice(startIndex, endIndex),
      totalPages
    };
  }, [getSortedAndFilteredPapers, currentPage]);

  // Calculate papers to display
  const { papers: currentPapers, totalPages } = getPaginatedPapers();

  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0); // Scroll to top when changing pages
  };
  
  // Add missing handler functions
  const handleSortChange = (value: SortOption) => {
    setSortBy(value);
  };
  
  const handleRelevancyScoreChange = (value: number) => {
    setMinRelevancyScore(value);
  };
  
  return {
    papers,
    setPapers,
    selectedPapers,
    setSelectedPapers,
    isLoading,
    setIsLoading,
    sortBy,
    setSortBy,
    minRelevancyScore,
    setMinRelevancyScore,
    currentPage,
    totalPages,
    currentPapers,
    handleTogglePaper,
    handleSearch,
    handlePageChange,
    handleSortChange,
    handleRelevancyScoreChange,
    loadPapersFromDatabase,
    handleCalculateRelevancy,
    isCalculatingRelevancy,
    relevancyProgress
  };
}; 