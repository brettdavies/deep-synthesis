import type { Paper } from '../schema/paper';
import type { Report } from '../schema/report';
import type { Setting } from '../schema/setting';

/**
 * Validate paper data before insertion or update
 */
export function validatePaper(paper: Partial<Paper>): void {
  if (!paper.title?.trim()) {
    throw new Error('Paper title is required');
  }
  if (!paper.authors?.length) {
    throw new Error('Paper must have at least one author');
  }
  if (!paper.abstract?.trim()) {
    throw new Error('Paper abstract is required');
  }
  if (!paper.year?.trim()) {
    throw new Error('Paper year is required');
  }
  if (!paper.source) {
    throw new Error('Paper source is required');
  }
}

/**
 * Validate report data before insertion or update
 */
export function validateReport(report: Partial<Report>): void {
  if (!report.title?.trim()) {
    throw new Error('Report title is required');
  }
  if (!report.query?.trim()) {
    throw new Error('Report query is required');
  }
  if (!report.references?.length) {
    throw new Error('Report must have at least one reference');
  }
}

/**
 * Validate setting data before insertion or update
 */
export function validateSetting(setting: Partial<Setting>): void {
  if (!setting.provider?.trim()) {
    throw new Error('Setting provider is required');
  }
}

/**
 * Validate PDF chunk data
 */
export function validatePdfChunk(chunk: Paper['pdfChunks'][0]): void {
  if (typeof chunk.chunkIndex !== 'number' || chunk.chunkIndex < 0) {
    throw new Error('Invalid chunk index');
  }
  if (!chunk.data) {
    throw new Error('Chunk data is required');
  }
  if (typeof chunk.size !== 'number' || chunk.size <= 0) {
    throw new Error('Invalid chunk size');
  }
} 