import type { Table } from 'dexie';

export interface Report {
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

export type ReportTable = Table<Report>;

export const REPORT_SCHEMA = 'id, title, query, date, createdAt, updatedAt'; 