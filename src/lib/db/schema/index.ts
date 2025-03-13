import type { PaperTable } from './paper';
import type { BriefTable } from './brief';
import type { SettingTable } from './setting';
import type { PaperBriefAssociationTable } from './paper-brief';
import { PAPER_SCHEMA } from './paper';
import { BRIEF_SCHEMA } from './brief';
import { SETTING_SCHEMA } from './setting';
import { PAPER_BRIEF_ASSOCIATION_SCHEMA } from './paper-brief';

export type { PaperTable } from './paper';
export type { BriefTable, ChatMessage } from './brief';
export type { SettingTable } from './setting';
export type { PaperBriefAssociationTable } from './paper-brief';

export interface ResearchDBSchema {
  papers: PaperTable;
  settings: SettingTable;
  briefs: BriefTable;
  paperBriefAssociations: PaperBriefAssociationTable;
}

export const DB_VERSION = 4;

export const DB_SCHEMA = {
  papers: PAPER_SCHEMA,
  settings: SETTING_SCHEMA,
  briefs: BRIEF_SCHEMA,
  paperBriefAssociations: PAPER_BRIEF_ASSOCIATION_SCHEMA,
}; 