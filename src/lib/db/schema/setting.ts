import type { Table } from 'dexie';

export interface Setting {
  id: string;             // UUID v4
  provider: string;       // Service provider (e.g., 'arxiv', 'openai')
  value: any;
  apiKey?: string;        // API key for the service
  options?: Record<string, any>; // Additional options for the service
  createdAt: Date;
  updatedAt: Date;
}

export type SettingTable = Table<Setting>;

export const SETTING_SCHEMA = 'id, provider'; 