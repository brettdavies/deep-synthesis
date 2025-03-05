import type { Setting } from '../schema/setting';
import db from '../index';

export class SettingOperations {
  /**
   * Get a setting by ID with error handling
   */
  static async getById(id: string): Promise<Setting | null> {
    const setting = await db.settings.get(id);
    return setting || null;
  }

  /**
   * Get a setting by provider with error handling
   */
  static async getByProvider(provider: string): Promise<Setting | null> {
    const setting = await db.settings.where('provider').equals(provider).first();
    return setting || null;
  }

  /**
   * Create or update a setting
   */
  static async upsert(setting: Omit<Setting, 'id' | 'createdAt' | 'updatedAt'>) {
    return await db.transaction('rw', db.settings, async () => {
      const existing = await db.settings.where('provider').equals(setting.provider).first();
      
      if (existing) {
        await db.settings.update(existing.id, setting);
        return existing.id;
      } else {
        return await db.settings.add(setting as Setting);
      }
    });
  }

  /**
   * Delete a setting by ID with error handling
   */
  static async delete(id: string): Promise<boolean> {
    return await db.transaction('rw', db.settings, async () => {
      const count = await db.settings.where('id').equals(id).delete();
      return count > 0;
    });
  }

  /**
   * Get all settings
   */
  static async getAll(): Promise<Setting[]> {
    return await db.settings.toArray();
  }

  /**
   * Clear all settings
   */
  static async clearAll(): Promise<void> {
    return await db.transaction('rw', db.settings, async () => {
      await db.settings.clear();
    });
  }
} 