/**
 * Format a query string for arXiv API
 * Handles special characters and field prefixes
 */
export function formatArxivQuery(query: string): string {
  // Remove any existing URL encoding
  let formattedQuery = decodeURIComponent(query);
  
  // Replace special characters
  formattedQuery = formattedQuery
    .replace(/[""]/g, '"')  // Smart quotes to regular quotes
    .replace(/['']/g, "'")  // Smart apostrophes to regular apostrophes
    .replace(/[—–]/g, "-"); // Em/en dashes to hyphens
  
  // Handle field prefixes (ti:, abs:, au:)
  formattedQuery = formattedQuery.replace(
    /(\b(?:ti|abs|au|cat|jr|rn|id|all):)([^"]\S*)/g,
    '$1"$2"'
  );
  
  // Ensure proper spacing around operators
  formattedQuery = formattedQuery
    .replace(/\s*(AND|OR|NOT)\s*/g, ' $1 ')
    .replace(/([()])\s*/g, ' $1 ')
    .trim();
  
  return encodeURIComponent(formattedQuery);
}

/**
 * Add date constraints to a query
 */
export function addDateConstraints(query: string, dateConstraints: {
  beforeDate?: Date;
  afterDate?: Date;
  startDate?: Date;
  endDate?: Date;
}): string {
  let formattedQuery = query;
  
  if (dateConstraints.beforeDate) {
    const beforeDateStr = formatDateForArxiv(dateConstraints.beforeDate);
    formattedQuery += ` AND submittedDate:[* TO ${beforeDateStr}]`;
  }
  
  if (dateConstraints.afterDate) {
    const afterDateStr = formatDateForArxiv(dateConstraints.afterDate);
    formattedQuery += ` AND submittedDate:[${afterDateStr} TO *]`;
  }
  
  if (dateConstraints.startDate && dateConstraints.endDate) {
    const startDateStr = formatDateForArxiv(dateConstraints.startDate);
    const endDateStr = formatDateForArxiv(dateConstraints.endDate);
    formattedQuery += ` AND submittedDate:[${startDateStr} TO ${endDateStr}]`;
  }
  
  return formattedQuery;
}

/**
 * Format a date for arXiv query
 * Converts to YYYYMMDD format
 */
export function formatDateForArxiv(date: Date): string {
  return date.toISOString().split('T')[0].replace(/-/g, '');
}