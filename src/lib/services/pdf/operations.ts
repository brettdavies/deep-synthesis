import type { Paper } from '../../db/schema/paper';
import { PaperOperations } from '../../db/operations';
import { ensureHttps } from '../../utils/network/url';
import { CHUNK_SIZE, MAX_CONCURRENT_DOWNLOADS, type ProgressCallback, type DownloadQueueInterface } from './types';
import { pdfBlobCache } from './cache';

/**
 * Download a PDF in chunks and store in IndexedDB
 * @param paper Paper to download PDF for
 * @param onProgress Progress callback (0-100)
 */
export async function downloadPdfChunked(paper: Paper, onProgress?: ProgressCallback): Promise<void> {
  try {
    // Ensure HTTPS URL
    const url = ensureHttps(paper.pdfUrl);
    console.log(`Downloading PDF from URL: ${url}`);
    
    // Get total size first
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: {
        // Add user agent to prevent potential blocking
        'User-Agent': 'Mozilla/5.0 (compatible; DeepSynthesisBot/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF metadata: ${response.status} ${response.statusText}`);
    }
    
    const totalSize = parseInt(response.headers.get('content-length') || '0');
    console.log(`PDF total size: ${totalSize} bytes`);
    
    if (!totalSize) {
      throw new Error('Could not determine PDF size');
    }
    
    // Calculate number of chunks
    const numChunks = Math.ceil(totalSize / CHUNK_SIZE);
    console.log(`Downloading in ${numChunks} chunks of ${CHUNK_SIZE} bytes each`);
    
    const chunks: Paper['pdfChunks'] = [];
    
    // Download chunks
    for (let i = 0; i < numChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE - 1, totalSize - 1);
      
      console.log(`Downloading chunk ${i + 1}/${numChunks} (bytes ${start}-${end})`);
      
      const chunkResponse = await fetch(url, {
        headers: { 
          Range: `bytes=${start}-${end}`,
          'User-Agent': 'Mozilla/5.0 (compatible; DeepSynthesisBot/1.0)'
        }
      });
      
      if (!chunkResponse.ok) {
        throw new Error(`Failed to download chunk ${i + 1}/${numChunks}: ${chunkResponse.status} ${chunkResponse.statusText}`);
      }
      
      const blob = await chunkResponse.blob();
      console.log(`Received chunk ${i + 1}, size: ${blob.size} bytes`);
      
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

    console.log(`All chunks downloaded. Saving to database...`);
    
    // After all chunks are downloaded, update the paper with the complete PDF data
    await PaperOperations.update(paper.id, {
      pdfChunks: chunks,
      pdfSize: totalSize,
      pdfDownloadProgress: 100,
      pdfDownloaded: true,
      updatedAt: new Date()
    });
    
    console.log(`PDF successfully saved to database`);

  } catch (error) {
    // If there's an error, ensure we clear any partial download state
    console.error(`Error in downloadPdfChunked:`, error);
    await PaperOperations.update(paper.id, {
      pdfChunks: undefined,
      pdfSize: undefined,
      pdfDownloadProgress: undefined,
      pdfDownloaded: false,
      updatedAt: new Date()
    });
    throw error;
  }
}

/**
 * Get a complete PDF from chunks, loading from IndexedDB directly when needed
 * @param paper Paper to get PDF for
 * @returns Blob of complete PDF
 */
export async function getPdfFromChunks(paper: Paper): Promise<Blob | null> {
  console.log(`Getting PDF for paper: ${paper.id}`);
  
  // First check the in-memory cache
  const cachedBlob = pdfBlobCache.get(paper.id);
  if (cachedBlob) {
    console.log(`Using cached PDF blob for paper: ${paper.id}`);
    return cachedBlob;
  }

  // If no cached blob, we need to load and combine the chunks
  try {
    console.log(`No cached blob found, loading chunks from database for paper: ${paper.id}`);
    
    // If paper doesn't have pdfDownloaded flag set to true, return null
    if (!paper.pdfDownloaded) {
      console.log(`Paper ${paper.id} does not have PDF downloaded`);
      return null;
    }
    
    // If the paper object doesn't have chunks, load the full paper from the database
    let chunks = paper.pdfChunks;
    if (!chunks?.length) {
      console.log(`No chunks in paper object, loading from database for paper: ${paper.id}`);
      const fullPaper = await PaperOperations.getById(paper.id);
      chunks = fullPaper?.pdfChunks;
      
      if (!chunks?.length) {
        console.log(`No PDF chunks found in database for paper: ${paper.id}`);
        return null;
      }
    }
    
    console.log(`Found ${chunks.length} chunks for paper: ${paper.id}`);
    
    // Sort chunks by index
    const sortedChunks = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
    console.log(`Chunks sorted by index`);
    
    // Combine chunks
    const blobs = sortedChunks.map(chunk => chunk.data);
    console.log(`Extracted ${blobs.length} blob objects from chunks`);
    
    // Create the PDF blob with proper MIME type
    const pdfBlob = new Blob(blobs, { type: 'application/pdf' });
    console.log(`Combined PDF blob created, size: ${pdfBlob.size} bytes`);
    
    // Cache the blob for future use
    pdfBlobCache.set(paper.id, pdfBlob);
    
    return pdfBlob;
  } catch (error) {
    console.error(`Error in getPdfFromChunks:`, error);
    throw error;
  }
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