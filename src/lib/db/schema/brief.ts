import type { Table } from 'dexie';

export interface ChatMessage {
  id: string;        // UUID v4
  role: "ai" | "user";
  content: string;
  timestamp: Date;
}

export interface DateConstraints {
  beforeDate?: Date;
  afterDate?: Date;
  startDate?: Date;
  endDate?: Date;
}

export interface Brief {
  id: string;             // UUID v4
  title: string;
  query: string;
  refinedQuery?: string;  // AI-refined version of the query
  review: string;
  references: {
    paperId: string;
    text: string;
    pdfUrl: string;
  }[];
  searchQueries?: {
    id: string;
    term: string;
    isActive: boolean;
  }[];
  dateConstraint?: {
    type: 'none' | 'before' | 'after' | 'between';
    beforeDate: string | null;
    afterDate: string | null;
  };
  bibtex: string;
  date: Date;
  dateConstraints?: DateConstraints;  // Optional date constraints for paper search
  chatMessages?: ChatMessage[];  // Chat history with timestamps
  createdAt: Date;
  updatedAt: Date;
  lastOpenedAt?: Date;     // Tracking when brief was last viewed
  isComplete?: boolean;    // Flag indicating if brief is complete
}

export type BriefTable = Table<Brief>;

export const BRIEF_SCHEMA = 'id, title, query, refinedQuery, review, references, searchQueries, dateConstraint, bibtex, date, dateConstraints, chatMessages, createdAt, updatedAt, lastOpenedAt, isComplete'; 