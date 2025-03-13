import type { Table } from 'dexie';

export interface ChatMessage {
  id: string;        // UUID v4
  role: "ai" | "user";
  content: string;
  timestamp: Date;
}

export interface Brief {
  id: string;             // UUID v4
  title: string;
  query: string;
  review: string;
  references: {
    paperId: string;
    text: string;
    pdfUrl: string;
  }[];
  bibtex: string;
  date: Date;
  chatMessages?: ChatMessage[];  // Chat history with timestamps
  createdAt: Date;
  updatedAt: Date;
  lastOpenedAt?: Date;     // Tracking when brief was last viewed
  isComplete?: boolean;    // Flag indicating if brief is complete
}

export type BriefTable = Table<Brief>;

export const BRIEF_SCHEMA = 'id, title, query, review, references, bibtex, date, chatMessages, createdAt, updatedAt, lastOpenedAt, isComplete'; 