import type { PaperTable } from './paper';
import type { ReportTable } from './report';
import type { SettingTable } from './setting';
import { PAPER_SCHEMA } from './paper';
import { REPORT_SCHEMA } from './report';
import { SETTING_SCHEMA } from './setting';

export type { PaperTable } from './paper';
export type { ReportTable } from './report';
export type { SettingTable } from './setting';

export interface ResearchDBSchema {
  papers: PaperTable;
  settings: SettingTable;
  reports: ReportTable;
}

export const DB_VERSION = 1;

export const DB_SCHEMA = {
  papers: PAPER_SCHEMA,
  settings: SETTING_SCHEMA,
  reports: REPORT_SCHEMA,
}; 