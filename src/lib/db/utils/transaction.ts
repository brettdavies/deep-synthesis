import type { Table } from 'dexie';
import db from '../index';

/**
 * Execute a read transaction with proper error handling
 */
export async function executeReadTransaction<T>(
  tables: Table[],
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await db.transaction('r', tables, operation);
  } catch (error) {
    console.error('Read transaction failed:', error);
    throw error;
  }
}

/**
 * Execute a write transaction with proper error handling
 */
export async function executeWriteTransaction<T>(
  tables: Table[],
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await db.transaction('rw', tables, operation);
  } catch (error) {
    console.error('Write transaction failed:', error);
    throw error;
  }
}

/**
 * Execute a bulk operation with proper error handling and progress tracking
 */
export async function executeBulkOperation<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  onProgress?: (completed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = [];
  const total = items.length;

  for (let i = 0; i < total; i++) {
    try {
      const result = await operation(items[i]);
      results.push(result);
      onProgress?.(i + 1, total);
    } catch (error) {
      console.error(`Bulk operation failed at item ${i + 1}:`, error);
      throw error;
    }
  }

  return results;
} 