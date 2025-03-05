import type { Paper } from '../../db/schema/paper';

// Type for progress callback function
export type ProgressCallback = (progress: number) => void;

// Interface for download queue
export interface DownloadQueueInterface {
  add(paper: Paper, onProgress?: ProgressCallback): Promise<void>;
}

// Constants
export const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
export const MAX_CONCURRENT_DOWNLOADS = 5; 