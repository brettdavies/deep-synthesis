import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { ResearchDBSchema } from './schema/index';
import { DB_VERSION, DB_SCHEMA } from './schema/index';
import { paperHooks, briefHooks, settingHooks } from './hooks/index';
import { Migration, type MigrationContext } from './utils/migrations';
import { DatabaseError, TransactionError } from './utils/errors';
import { getMigrations } from './migrations';
import type { Paper } from './schema/paper';
import type { Brief } from './schema/brief';
import type { Setting } from './schema/setting';
import type { PaperBriefAssociation } from './schema/paper-brief';
import { PAPER_SCHEMA } from './schema/paper';
import { BRIEF_SCHEMA } from './schema/brief';
import { SETTING_SCHEMA } from './schema/setting';
import { PAPER_BRIEF_ASSOCIATION_SCHEMA } from './schema/paper-brief';

export interface ResearchDBSchema {
  papers: Table<Paper>;
  briefs: Table<Brief>;
  settings: Table<Setting>;
  paperBriefAssociations: Table<PaperBriefAssociation>;
}

// Define our database
export class ResearchDB extends Dexie {
  papers!: Table<Paper>;
  settings!: Table<Setting>;
  briefs!: Table<Brief>;
  paperBriefAssociations!: Table<PaperBriefAssociation>;
  private migration: Migration;

  constructor() {
    super('ResearchDB');
    this.migration = new Migration();
    
    // Define tables and indexes
    this.version(DB_VERSION)
      .stores({
        papers: PAPER_SCHEMA,
        briefs: BRIEF_SCHEMA,
        settings: SETTING_SCHEMA,
        paperBriefAssociations: PAPER_BRIEF_ASSOCIATION_SCHEMA
      })
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
      await this.transaction('rw', [this.papers, this.settings, this.briefs, this.paperBriefAssociations], async () => {
        await Promise.all([
          this.papers.clear(),
          this.settings.clear(),
          this.briefs.clear(),
          this.paperBriefAssociations.clear()
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
        briefs: await this.migration.backupTable(this.briefs),
        paperBriefAssociations: await this.migration.backupTable(this.paperBriefAssociations)
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
      await this.transaction('rw', [this.papers, this.settings, this.briefs, this.paperBriefAssociations], async () => {
        await Promise.all([
          this.migration.restoreTable(this.papers, backup.papers),
          this.migration.restoreTable(this.settings, backup.settings),
          this.migration.restoreTable(this.briefs, backup.briefs),
          this.migration.restoreTable(this.paperBriefAssociations, backup.paperBriefAssociations)
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

// Export database instance, operations and types
export default db;
export * from './operations';
export type { Table }; 