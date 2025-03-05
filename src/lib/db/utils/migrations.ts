import type { Table } from 'dexie';
import { DatabaseError } from './errors';

export interface MigrationContext {
  oldVersion: number;
  newVersion: number;
  transaction: any;
}

export type MigrationFunction = (context: MigrationContext) => Promise<void>;

export class Migration {
  private migrations: Map<number, MigrationFunction> = new Map();

  addMigration(version: number, migrationFn: MigrationFunction) {
    if (this.migrations.has(version)) {
      throw new DatabaseError(`Migration for version ${version} already exists`);
    }
    this.migrations.set(version, migrationFn);
  }

  async runMigrations(context: MigrationContext): Promise<void> {
    const { oldVersion, newVersion } = context;
    
    for (let version = oldVersion + 1; version <= newVersion; version++) {
      const migration = this.migrations.get(version);
      if (migration) {
        await migration(context);
      }
    }
  }

  async backupTable<T>(table: Table<T, any>): Promise<T[]> {
    return await table.toArray();
  }

  async restoreTable<T>(table: Table<T, any>, data: T[]): Promise<void> {
    await table.bulkPut(data);
  }
} 