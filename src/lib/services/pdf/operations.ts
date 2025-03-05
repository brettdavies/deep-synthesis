import type { Paper } from '../../db/schema/paper';
import { PaperOperations } from '../../db/operations';
import { ensureHttps } from '../../utils/network/url';
import { CHUNK_SIZE, MAX_CONCURRENT_DOWNLOADS, type ProgressCallback, type DownloadQueueInterface } from './types';

/**
 * Download a PDF in chunks and store in IndexedDB
 * @param paper Paper to download PDF for
 * @param onProgress Progress callback (0-100)
 */
export async function downloadPdfChunked(paper: Paper, onProgress?: ProgressCallback): Promise<void> {
  try {
    // Ensure HTTPS URL
    const url = ensureHttps(paper.pdfUrl);
    
    // Get total size first
    const response = await fetch(url, { method: 'HEAD' });
    const totalSize = parseInt(response.headers.get('content-length') || '0');
    
    if (!totalSize) {
      throw new Error('Could not determine PDF size');
    }
    
    // Calculate number of chunks
    const numChunks = Math.ceil(totalSize / CHUNK_SIZE);
    const chunks: Paper['pdfChunks'] = [];
    
    // Download chunks
    for (let i = 0; i < numChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE - 1, totalSize - 1);
      
      const chunkResponse = await fetch(url, {
        headers: { Range: `bytes=${start}-${end}` }
      });
      
      if (!chunkResponse.ok) {
        throw new Error(`Failed to download chunk ${i + 1}/${numChunks}`);
      }
      
      const blob = await chunkResponse.blob();
      chunks.push({
        chunkIndex: i,
        data: blob,
        size: blob.size
      });
      
      // Update progress
      const progress = Math.round((i + 1) / numChunks * 100);
      onProgress?.(progress);
      
      // Update paper in database with current progress
      await PaperOperations.update(paper.id, {
        pdfDownloadProgress: progress,
        updatedAt: new Date()
      });
    }

    // After all chunks are downloaded, update the paper with the complete PDF data
    await PaperOperations.update(paper.id, {
      pdfChunks: chunks,
      pdfSize: totalSize,
      pdfDownloadProgress: 100,
      pdfDownloaded: true,
      updatedAt: new Date()
    });

  } catch (error) {
    // If there's an error, ensure we clear any partial download state
    await PaperOperations.update(paper.id, {
      pdfChunks: undefined,
      pdfSize: undefined,
      pdfDownloadProgress: undefined,
      pdfDownloaded: false,
      updatedAt: new Date()
    });
    console.error('Error downloading PDF:', error);
    throw error;
  }
}

/**
 * Get a complete PDF from chunks
 * @param paper Paper to get PDF for
 * @returns Blob of complete PDF
 */
export async function getPdfFromChunks(paper: Paper): Promise<Blob | null> {
  if (!paper.pdfChunks?.length) {
    return null;
  }
  
  // Sort chunks by index
  const sortedChunks = [...paper.pdfChunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
  
  // Combine chunks
  const blobs = sortedChunks.map(chunk => chunk.data);
  return new Blob(blobs, { type: 'application/pdf' });
}

/**
 * Queue for managing concurrent downloads
 */
class DownloadQueue implements DownloadQueueInterface {
  private queue: Paper[] = [];
  private processing: Set<string> = new Set();
  
  /**
   * Add a paper to the download queue
   * @param paper Paper to download
   * @param onProgress Progress callback
   */
  async add(paper: Paper, onProgress?: ProgressCallback): Promise<void> {
    if (this.processing.size >= MAX_CONCURRENT_DOWNLOADS) {
      this.queue.push(paper);
      return;
    }
    
    this.processing.add(paper.id);
    
    try {
      await downloadPdfChunked(paper, onProgress);
    } finally {
      this.processing.delete(paper.id);
      this.processNext();
    }
  }
  
  private processNext() {
    if (this.queue.length > 0 && this.processing.size < MAX_CONCURRENT_DOWNLOADS) {
      const paper = this.queue.shift()!;
      this.add(paper);
    }
  }
}

export const downloadQueue = new DownloadQueue(); 