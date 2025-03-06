import type { Paper } from '../schema/paper';
import type { Brief } from '../schema/brief';
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
 * Validate brief data before insertion or update
 */
export function validateBrief(brief: Partial<Brief>): void {
  if (!brief.title?.trim()) {
    throw new Error('Brief title is required');
  }
  if (!brief.query?.trim()) {
    throw new Error('Brief query is required');
  }
  if (!brief.references?.length) {
    throw new Error('Brief must have at least one reference');
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