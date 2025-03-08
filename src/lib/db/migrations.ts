import db from './index';
import type { MigrationContext } from './utils/migrations';
import type { ResearchDB } from './index';

/**
 * Migration for version 2: Add chatMessages field to briefs table
 */
export function getMigrations(db: ResearchDB) {
  db.addMigration(2, async (context: MigrationContext) => {
    console.log('Running migration for version 2: Adding chatMessages to briefs');
    
    // Migration to add chatMessages field to existing briefs
    if (context.oldVersion < 2) {
      const briefs = await db.briefs.toArray();
      
      // Add empty chatMessages array to each brief
      const updatedBriefs = briefs.map(brief => ({
        ...brief,
        chatMessages: [],
      }));
      
      // Update all briefs with new field
      await Promise.all(updatedBriefs.map(brief => db.briefs.put(brief)));
      
      console.log(`Migration complete: Updated ${updatedBriefs.length} briefs with chatMessages field`);
    }
  });
} 