import type { DateConstraint } from './types';
import type { Brief } from '@/lib/db/schema/brief';

/**
 * Format date constraints for display in search queries
 */
export const formatDateConstraintForDisplay = (constraint?: DateConstraint): string => {
  if (!constraint || constraint.type === 'none') return '';
  
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    // Convert YYYY-MM-DD to YYYYMMDD format for arXiv API
    return dateStr.replace(/-/g, '');
  };
  
  switch (constraint.type) {
    case 'before':
      return ` AND submittedDate:[* TO ${formatDate(constraint.beforeDate)}]`;
    case 'after':
      return ` AND submittedDate:[${formatDate(constraint.afterDate)} TO *]`;
    case 'between':
      return ` AND submittedDate:[${formatDate(constraint.afterDate)} TO ${formatDate(constraint.beforeDate)}]`;
    default:
      return '';
  }
};

// Function to format date in arXiv format
const formatDateString = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null;
  return dateStr.replace(/-/g, ''); // Convert YYYY-MM-DD to YYYYMMDD
};

// Cache to prevent redundant processing of the same query/constraint combination
const constraintCache = new Map<string, string>();

/**
 * Add date constraints to query with caching to prevent redundant processing
 */
export const addDateConstraints = (query: string, dateConstraint?: DateConstraint, brief?: Brief): string => {
  // Create a cache key from the query and constraint
  const cacheKey = JSON.stringify({ query, dateConstraint });
  
  // Check if we've already processed this combination
  if (constraintCache.has(cacheKey)) {
    return constraintCache.get(cacheKey)!;
  }
  
  // Only log once per session to reduce console noise
  if (!addDateConstraints.hasLogged) {
    console.log('Adding date constraints to query:', query);
    console.log('Date constraint being applied:', dateConstraint);
    addDateConstraints.hasLogged = true;
  }
  
  let result = query;
  
  if (!dateConstraint || dateConstraint.type === 'none') {
    // Check if there are date constraints in the brief
    if (!brief?.dateConstraints) {
      constraintCache.set(cacheKey, result);
      return result;
    }

    const { beforeDate, afterDate, startDate, endDate } = brief.dateConstraints;
    
    const formatDate = (date: Date) => date.toISOString().split('T')[0].replace(/-/g, '');
    
    if (beforeDate) {
      result += ` AND submittedDate:[* TO ${formatDate(beforeDate)}]`;
    }
    
    if (afterDate) {
      result += ` AND submittedDate:[${formatDate(afterDate)} TO *]`;
    }
    
    if (startDate && endDate) {
      result += ` AND submittedDate:[${formatDate(startDate)} TO ${formatDate(endDate)}]`;
    }
    
    constraintCache.set(cacheKey, result);
    return result;
  }
  
  // Process AI-extracted date constraints
  switch (dateConstraint.type) {
    case 'before':
      if (dateConstraint.beforeDate) {
        const formattedDate = formatDateString(dateConstraint.beforeDate);
        if (formattedDate) {
          result += ` AND submittedDate:[* TO ${formattedDate}]`;
          // Limit logging to one per type to reduce console noise
          if (!addDateConstraints.hasLoggedBefore) {
            console.log('Added before date constraint:', result);
            addDateConstraints.hasLoggedBefore = true;
          }
        }
      }
      break;
      
    case 'after':
      if (dateConstraint.afterDate) {
        const formattedDate = formatDateString(dateConstraint.afterDate);
        if (formattedDate) {
          result += ` AND submittedDate:[${formattedDate} TO *]`;
          if (!addDateConstraints.hasLoggedAfter) {
            console.log('Added after date constraint:', result);
            addDateConstraints.hasLoggedAfter = true;
          }
        }
      }
      break;
      
    case 'between':
      if (dateConstraint.afterDate && dateConstraint.beforeDate) {
        const fromDate = formatDateString(dateConstraint.afterDate);
        const toDate = formatDateString(dateConstraint.beforeDate);
        if (fromDate && toDate) {
          result += ` AND submittedDate:[${fromDate} TO ${toDate}]`;
          if (!addDateConstraints.hasLoggedBetween) {
            console.log('Added between date constraint:', result);
            addDateConstraints.hasLoggedBetween = true;
          }
        }
      }
      break;
  }
  
  // Cache the result
  constraintCache.set(cacheKey, result);
  return result;
};

// Add static properties for tracking logging
addDateConstraints.hasLogged = false;
addDateConstraints.hasLoggedBefore = false;
addDateConstraints.hasLoggedAfter = false;
addDateConstraints.hasLoggedBetween = false;

/**
 * Get API preview URL for a query
 */
export const getApiPreviewUrl = (query: string, dateConstraint?: DateConstraint): string => {
  // Use the full search query with date constraints
  const fullQuery = addDateConstraints(query, dateConstraint);
  return `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(fullQuery)}`;
};

/**
 * Calculate paper counts by relevancy bucket
 */
export const calculatePaperCounts = (papers: any[]) => {
  return papers.reduce((acc, paper) => {
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
  }, {} as Record<string, number>);
}; 