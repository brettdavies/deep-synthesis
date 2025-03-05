import type { Report } from '../schema/report';
import db from '../index';

export class ReportOperations {
  /**
   * Create a new report in the database
   */
  static async create(report: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>) {
    return await db.transaction('rw', db.reports, async () => {
      return await db.reports.add(report as Report);
    });
  }

  /**
   * Update a report in the database
   */
  static async update(id: string, updates: Partial<Report>) {
    return await db.transaction('rw', db.reports, async () => {
      const count = await db.reports.update(id, updates);
      if (count === 0) throw new Error(`Report with id ${id} not found`);
      return count;
    });
  }

  /**
   * Get a report by ID with error handling
   */
  static async getById(id: string): Promise<Report | null> {
    const report = await db.reports.get(id);
    return report || null;
  }

  /**
   * Delete a report by ID with error handling
   */
  static async delete(id: string): Promise<boolean> {
    return await db.transaction('rw', db.reports, async () => {
      const count = await db.reports.where('id').equals(id).delete();
      return count > 0;
    });
  }

  /**
   * Get all reports with optional pagination and sorting
   */
  static async getAll(options?: { 
    offset?: number; 
    limit?: number;
    orderBy?: keyof Report;
    descending?: boolean;
  }) {
    let query = db.reports.orderBy(options?.orderBy || 'updatedAt');
    
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
   * Search reports by title or query
   */
  static async search(searchTerm: string, options?: { 
    limit?: number;
    offset?: number;
  }) {
    const term = searchTerm.toLowerCase();
    
    return await db.transaction('r', db.reports, async () => {
      let matches = await db.reports
        .filter(report => 
          report.title.toLowerCase().includes(term) ||
          report.query.toLowerCase().includes(term)
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
   * Count total number of reports
   */
  static async count(): Promise<number> {
    return await db.reports.count();
  }
} 