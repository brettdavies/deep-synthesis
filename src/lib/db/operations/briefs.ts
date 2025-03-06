import type { Brief } from '../schema/brief';
import db from '../index';

export class BriefOperations {
  /**
   * Create a new brief in the database
   */
  static async create(brief: Omit<Brief, 'id' | 'createdAt' | 'updatedAt'>) {
    return await db.transaction('rw', db.briefs, async () => {
      return await db.briefs.add(brief as Brief);
    });
  }

  /**
   * Update a brief in the database
   */
  static async update(id: string, updates: Partial<Brief>) {
    return await db.transaction('rw', db.briefs, async () => {
      const count = await db.briefs.update(id, updates);
      if (count === 0) throw new Error(`Brief with id ${id} not found`);
      return count;
    });
  }

  /**
   * Get a brief by ID with error handling
   */
  static async getById(id: string): Promise<Brief | null> {
    const brief = await db.briefs.get(id);
    return brief || null;
  }

  /**
   * Delete a brief by ID with error handling
   */
  static async delete(id: string): Promise<boolean> {
    return await db.transaction('rw', db.briefs, async () => {
      const count = await db.briefs.where('id').equals(id).delete();
      return count > 0;
    });
  }

  /**
   * Get all briefs with optional pagination and sorting
   */
  static async getAll(options?: { 
    offset?: number; 
    limit?: number;
    orderBy?: keyof Brief;
    descending?: boolean;
  }) {
    let query = db.briefs.orderBy(options?.orderBy || 'updatedAt');
    
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
   * Search briefs by title or query
   */
  static async search(searchTerm: string, options?: { 
    limit?: number;
    offset?: number;
  }) {
    const term = searchTerm.toLowerCase();
    
    return await db.transaction('r', db.briefs, async () => {
      let matches = await db.briefs
        .filter(brief => 
          brief.title.toLowerCase().includes(term) ||
          brief.query.toLowerCase().includes(term)
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
   * Count total number of briefs
   */
  static async count(): Promise<number> {
    return await db.briefs.count();
  }
} 