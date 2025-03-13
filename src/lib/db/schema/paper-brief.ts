import type { Table } from 'dexie';

export interface RelevancyReason {
  reason: string;
  impactOnScore: number; // positive or negative impact
}

export interface RelevancyData {
  overallScore: number; // 0-100 scale  
  reasons: RelevancyReason[];
  keywordsMatched: string[];
  confidenceLevel: number; // 0-100 scale
}

export interface PaperBriefAssociation {
  id: string;              // UUID v4
  briefId: string;         // Reference to Brief
  paperId: string;         // Reference to Paper
  searchQuery: string[];     // The queries that found this paper
  isSelected: boolean;     // Whether paper is selected for final report
  relevancyScore?: number; // AI-calculated relevancy score (0-100)
  relevancyJustification?: string; // One-sentence explanation of relevancy score
  relevancyData?: RelevancyData; // Detailed relevancy information
  createdAt: Date;         // When the association was created
  updatedAt: Date;         // When the association was last updated
}

export type PaperBriefAssociationTable = Table<PaperBriefAssociation>;

export const PAPER_BRIEF_ASSOCIATION_SCHEMA = 'id, [briefId+paperId], searchQuery, isSelected, relevancyScore, createdAt, updatedAt'; 