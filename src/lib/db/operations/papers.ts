import type { Paper } from '../schema/paper';
import db from '../index';

export class PaperOperations {
  /**
   * Create a new paper in the database
   */
  static async create(paper: Omit<Paper, 'id' | 'createdAt' | 'updatedAt'>) {
    return await db.transaction('rw', db.papers, async () => {
      return await db.papers.add(paper as Paper);
    });
  }

  /**
   * Bulk create papers in the database
   */
  static async bulkCreate(papers: Omit<Paper, 'id' | 'createdAt' | 'updatedAt'>[]) {
    return await db.transaction('rw', db.papers, async () => {
      return await db.papers.bulkAdd(papers as Paper[]);
    });
  }

  /**
   * Update a paper in the database
   */
  static async update(id: string, updates: Partial<Paper>) {
    return await db.transaction('rw', db.papers, async () => {
      const count = await db.papers.update(id, updates);
      if (count === 0) throw new Error(`Paper with id ${id} not found`);
      return count;
    });
  }

  /**
   * Bulk update papers in the database
   */
  static async bulkUpdate(updates: { id: string; changes: Partial<Paper> }[]) {
    return await db.transaction('rw', db.papers, async () => {
      return await Promise.all(
        updates.map(({ id, changes }) => db.papers.update(id, changes))
      );
    });
  }

  /**
   * Update PDF chunks for a paper
   */
  static async updatePdfChunks(id: string, chunks: Paper['pdfChunks'], size: number) {
    return await db.transaction('rw', db.papers, async () => {
      const paper = await db.papers.get(id);
      if (!paper) throw new Error(`Paper with id ${id} not found`);

      return await db.papers.update(id, {
        pdfChunks: chunks,
        pdfSize: size,
        pdfDownloaded: true,
        pdfDownloadProgress: 100
      });
    });
  }

  /**
   * Get a paper by ID with error handling
   */
  static async getById(id: string): Promise<Paper | null> {
    const paper = await db.papers.get(id);
    return paper || null;
  }

  /**
   * Get a paper by arXiv ID with error handling
   */
  static async getByArxivId(arxivId: string): Promise<Paper | null> {
    const paper = await db.papers.where('arxivId').equals(arxivId).first();
    return paper || null;
  }

  /**
   * Delete a paper by ID with error handling
   */
  static async delete(id: string): Promise<boolean> {
    return await db.transaction('rw', db.papers, async () => {
      const count = await db.papers.where('id').equals(id).delete();
      return count > 0;
    });
  }

  /**
   * Bulk delete papers by ID
   */
  static async bulkDelete(ids: string[]): Promise<number> {
    return await db.transaction('rw', db.papers, async () => {
      return await db.papers.where('id').anyOf(ids).delete();
    });
  }

  /**
   * Get all papers with optional pagination and sorting
   */
  static async getAll(options?: { 
    offset?: number; 
    limit?: number;
    orderBy?: keyof Paper;
    descending?: boolean;
  }) {
    let query = db.papers.orderBy(options?.orderBy || 'updatedAt');
    
    if (options?.descending) {
      query = query.reverse();
    }
    
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    return await query.toArray();
  }

  /**
   * Search papers by title or abstract with improved performance
   */
  static async search(query: string, options?: { 
    limit?: number;
    offset?: number;
  }) {
    const searchTerm = query.toLowerCase();
    
    return await db.transaction('r', db.papers, async () => {
      let matches = await db.papers
        .filter(paper => 
          paper.title.toLowerCase().includes(searchTerm) ||
          paper.abstract.toLowerCase().includes(searchTerm)
        );

      if (options?.offset) {
        matches = matches.offset(options.offset);
      }

      if (options?.limit) {
        matches = matches.limit(options.limit);
      }

      return await matches.toArray();
    });
  }

  /**
   * Count total number of papers
   */
  static async count(): Promise<number> {
    return await db.papers.count();
  }
} 