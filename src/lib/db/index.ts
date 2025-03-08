import Dexie from 'dexie';
import type { ResearchDBSchema } from './schema/index';
import { DB_VERSION, DB_SCHEMA } from './schema/index';
import { paperHooks, briefHooks, settingHooks } from './hooks/index';
import { Migration, type MigrationContext } from './utils/migrations';
import { DatabaseError, TransactionError } from './utils/errors';
import { getMigrations } from './migrations';

// Define our database
export class ResearchDB extends Dexie {
  papers!: ResearchDBSchema['papers'];
  settings!: ResearchDBSchema['settings'];
  briefs!: ResearchDBSchema['briefs'];
  private migration: Migration;

  constructor() {
    super('ResearchDB');
    this.migration = new Migration();
    
    // Define tables and indexes
    this.version(DB_VERSION)
      .stores(DB_SCHEMA)
      .upgrade(async (trans: any) => {
        const context: MigrationContext = {
          oldVersion: trans.oldVersion || 0,
          newVersion: DB_VERSION,
          transaction: trans
        };
        await this.migration.runMigrations(context);
      });

    // Add hooks
    this.papers.hook('creating', paperHooks.creating);
    this.papers.hook('updating', paperHooks.updating);
    this.settings.hook('creating', settingHooks.creating);
    this.settings.hook('updating', settingHooks.updating);
    this.briefs.hook('creating', briefHooks.creating);
    this.briefs.hook('updating', briefHooks.updating);
  }

  /**
   * Get database version
   */
  getVersion(): number {
    return DB_VERSION;
  }

  /**
   * Add a migration function for a specific version
   */
  addMigration(version: number, migrationFn: (context: MigrationContext) => Promise<void>): void {
    this.migration.addMigration(version, migrationFn);
  }

  /**
   * Clear all data from the database
   */
  async clearAllData(): Promise<void> {
    try {
      await this.transaction('rw', [this.papers, this.settings, this.briefs], async () => {
        await Promise.all([
          this.papers.clear(),
          this.settings.clear(),
          this.briefs.clear()
        ]);
      });
    } catch (error) {
      throw new TransactionError('Failed to clear database', error as Error);
    }
  }

  /**
   * Backup database tables
   */
  async backup(): Promise<Record<string, any[]>> {
    try {
      return {
        papers: await this.migration.backupTable(this.papers),
        settings: await this.migration.backupTable(this.settings),
        briefs: await this.migration.backupTable(this.briefs)
      };
    } catch (error) {
      throw new DatabaseError('Failed to backup database', error as Error);
    }
  }

  /**
   * Restore database from backup
   */
  async restore(backup: Record<string, any[]>): Promise<void> {
    try {
      await this.transaction('rw', [this.papers, this.settings, this.briefs], async () => {
        await Promise.all([
          this.migration.restoreTable(this.papers, backup.papers),
          this.migration.restoreTable(this.settings, backup.settings),
          this.migration.restoreTable(this.briefs, backup.briefs)
        ]);
      });
    } catch (error) {
      throw new DatabaseError('Failed to restore database', error as Error);
    }
  }
}

// Create a singleton instance
export const db = new ResearchDB();

// Register migrations
getMigrations(db);

// Export database instance and operations
export default db;
export * from './operations'; 