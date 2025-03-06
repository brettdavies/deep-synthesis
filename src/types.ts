/**
 * Type definitions for the application
 */

export interface Report {
  id: string;
  title: string;
  description?: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
  status: 'draft' | 'published' | 'archived';
  author?: string;
  content?: string;
}

// Add other types as needed 