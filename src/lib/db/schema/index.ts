import type { PaperTable } from './paper';
import type { BriefTable } from './brief';
import type { SettingTable } from './setting';
import { PAPER_SCHEMA } from './paper';
import { BRIEF_SCHEMA } from './brief';
import { SETTING_SCHEMA } from './setting';

export type { PaperTable } from './paper';
export type { BriefTable, ChatMessage } from './brief';
export type { SettingTable } from './setting';

export interface ResearchDBSchema {
  papers: PaperTable;
  settings: SettingTable;
  briefs: BriefTable;
}

export const DB_VERSION = 2;

export const DB_SCHEMA = {
  papers: PAPER_SCHEMA,
  settings: SETTING_SCHEMA,
  briefs: BRIEF_SCHEMA,
}; 