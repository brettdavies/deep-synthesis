import type { Table } from 'dexie';

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
  createdAt: Date;
  updatedAt: Date;
}

export type BriefTable = Table<Brief>;

export const BRIEF_SCHEMA = 'id, title, query, review, references, bibtex, date, createdAt, updatedAt'; 