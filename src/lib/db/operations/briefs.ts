import type { Brief, ChatMessage } from '../schema/brief';
import db from '../index';
import { generateUUID, isValidUUID } from '@/lib/utils/id/uuid';

export class BriefOperations {
  /**
   * Create a new brief in the database
   */
  static async create(brief: Omit<Brief, 'id' | 'createdAt' | 'updatedAt'>) {
    return await db.transaction('rw', db.briefs, async () => {
      return await db.briefs.add(brief as Brief);
    });
  }

  /**
   * Update a brief in the database
   */
  static async update(id: string, updates: Partial<Brief>) {
    return await db.transaction('rw', db.briefs, async () => {
      const count = await db.briefs.update(id, updates);
      if (count === 0) throw new Error(`Brief with id ${id} not found`);
      return count;
    });
  }

  /**
   * Get a brief by ID with error handling
   */
  static async getById(id: string): Promise<Brief | null> {
    const brief = await db.briefs.get(id);
    return brief || null;
  }

  /**
   * Delete a brief by ID with error handling
   */
  static async delete(id: string): Promise<boolean> {
    return await db.transaction('rw', db.briefs, async () => {
      const count = await db.briefs.where('id').equals(id).delete();
      return count > 0;
    });
  }

  /**
   * Get all briefs with optional pagination and sorting
   */
  static async getAll(options?: { 
    offset?: number; 
    limit?: number;
    orderBy?: keyof Brief;
    descending?: boolean;
  }) {
    let query = db.briefs.orderBy(options?.orderBy || 'updatedAt');
    
    if (options?.descending) {
      query = query.reverse();
    }
    
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    return await query.toArray();
  }

  /**
   * Search briefs by title or query
   */
  static async search(searchTerm: string, options?: { 
    limit?: number;
    offset?: number;
  }) {
    const term = searchTerm.toLowerCase();
    
    return await db.transaction('r', db.briefs, async () => {
      let matches = await db.briefs
        .filter(brief => 
          brief.title.toLowerCase().includes(term) ||
          brief.query.toLowerCase().includes(term)
        );

      if (options?.offset) {
        matches = matches.offset(options.offset);
      }

      if (options?.limit) {
        matches = matches.limit(options.limit);
      }

      return await matches.toArray();
    });
  }

  /**
   * Count total number of briefs
   */
  static async count(): Promise<number> {
    return await db.briefs.count();
  }

  /**
   * Get chat messages for a brief
   */
  static async getChatMessages(briefId: string): Promise<ChatMessage[]> {
    return await db.transaction('r', db.briefs, async () => {
      const brief = await db.briefs.get(briefId);
      if (!brief) throw new Error(`Brief with id ${briefId} not found`);
      return brief.chatMessages || [];
    });
  }

  /**
   * Add a chat message to a brief
   */
  static async addChatMessage(briefId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<string> {
    return await db.transaction('rw', db.briefs, async () => {
      const brief = await db.briefs.get(briefId);
      if (!brief) throw new Error(`Brief with id ${briefId} not found`);
      
      const newMessage: ChatMessage = {
        id: generateUUID(),
        ...message,
        timestamp: new Date()
      };
      
      const chatMessages = brief.chatMessages || [];
      chatMessages.push(newMessage);
      
      await db.briefs.update(briefId, { 
        chatMessages,
        updatedAt: new Date()
      });
      
      return newMessage.id;
    });
  }

  /**
   * Update a chat message
   */
  static async updateChatMessage(
    briefId: string, 
    messageId: string, 
    updates: Partial<Omit<ChatMessage, 'id' | 'timestamp'>>
  ): Promise<boolean> {
    return await db.transaction('rw', db.briefs, async () => {
      const brief = await db.briefs.get(briefId);
      if (!brief) throw new Error(`Brief with id ${briefId} not found`);
      
      const chatMessages = brief.chatMessages || [];
      const messageIndex = chatMessages.findIndex(msg => msg.id === messageId);
      
      if (messageIndex === -1) {
        throw new Error(`Message with id ${messageId} not found in brief ${briefId}`);
      }
      
      chatMessages[messageIndex] = {
        ...chatMessages[messageIndex],
        ...updates,
        // Don't update the timestamp for edits to preserve the conversation flow
      };
      
      await db.briefs.update(briefId, { 
        chatMessages,
        updatedAt: new Date()
      });
      
      return true;
    });
  }

  /**
   * Set all chat messages for a brief (replaces existing messages)
   */
  static async setChatMessages(briefId: string, messages: Omit<ChatMessage, 'id' | 'timestamp'>[]): Promise<boolean> {
    return await db.transaction('rw', db.briefs, async () => {
      const brief = await db.briefs.get(briefId);
      if (!brief) throw new Error(`Brief with id ${briefId} not found`);
      
      const chatMessages: ChatMessage[] = messages.map(msg => ({
        id: generateUUID(),
        ...msg,
        timestamp: new Date()
      }));
      
      await db.briefs.update(briefId, { 
        chatMessages,
        updatedAt: new Date() 
      });
      
      return true;
    });
  }

  /**
   * Clear all chat messages for a brief
   */
  static async clearChatMessages(briefId: string): Promise<boolean> {
    return await db.transaction('rw', db.briefs, async () => {
      const brief = await db.briefs.get(briefId);
      if (!brief) throw new Error(`Brief with id ${briefId} not found`);
      
      await db.briefs.update(briefId, { 
        chatMessages: [],
        updatedAt: new Date() 
      });
      
      return true;
    });
  }

  /**
   * Create an initial brief with just the query
   * @param query The initial query (can be empty)
   * @param customId Optional custom ID for the brief (if not provided, a random UUID will be generated)
   */
  static async createInitialBrief(query: string, customId?: string): Promise<string> {
    return await db.transaction('rw', db.briefs, async () => {
      try {
        // Validate customId if provided
        if (customId && !isValidUUID(customId)) {
          throw new Error('Invalid UUID format for customId');
        }
        
        const briefTitle = query.length > 50 ? query.substring(0, 50) + '...' : query;
        const newBriefId = customId || generateUUID();
        
        console.log('[createInitialBrief] Generated UUID:', newBriefId);
        
        // Create an initial brief with just the query
        const initialBrief: Brief = {
          id: newBriefId,
          title: briefTitle,
          query: query,
          review: '', // Empty initially
          references: [], // Empty initially
          bibtex: '',
          date: new Date(),
          chatMessages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          lastOpenedAt: new Date(),
          isComplete: false
        };
        
        // Add the brief to the database
        await db.briefs.add(initialBrief);
        
        // Verify the brief was added by retrieving it
        const savedBrief = await db.briefs.get(newBriefId);
        if (!savedBrief) {
          console.error(`[createInitialBrief] Failed to save brief with ID: ${newBriefId}`, initialBrief);
          throw new Error(`Failed to save brief with ID ${newBriefId}`);
        }
        
        console.log('[DB Operation] Created and verified brief:', savedBrief);
        
        return newBriefId;
      } catch (error) {
        console.error('[DB Operation] Error creating brief:', error);
        throw error;
      }
    });
  }

  /**
   * Update brief with refined query
   */
  static async updateWithRefinedQuery(briefId: string, refinedQuery: string): Promise<boolean> {
    return await db.transaction('rw', db.briefs, async () => {
      const briefTitle = refinedQuery.length > 50 ? refinedQuery.substring(0, 50) + '...' : refinedQuery;
      
      const updates = {
        title: briefTitle,
        query: refinedQuery,
        updatedAt: new Date()
      };
      
      const count = await db.briefs.update(briefId, updates);
      
      console.log('[DB Operation] Updated brief with refined query:', { 
        briefId, 
        updates,
        success: count > 0 
      });
      
      if (count === 0) throw new Error(`Brief with id ${briefId} not found`);
      return count > 0;
    });
  }

  /**
   * Update brief with paper references
   * @param briefId The ID of the brief to update
   * @param papers The papers to add as references
   * @param replace Whether to replace existing references (true) or append (false)
   */
  static async updateWithPaperReferences(briefId: string, papers: Array<{
    id: string;
    title: string;
    authors: string[] | string;
    year: string;
    pdfUrl?: string;
  }>, replace: boolean = true): Promise<boolean> {
    return await db.transaction('rw', db.briefs, async () => {
      const brief = await db.briefs.get(briefId);
      if (!brief) throw new Error(`Brief with id ${briefId} not found`);
      
      // Create reference objects for the papers
      const newReferences = papers.map(paper => ({
        paperId: paper.id,
        text: `${Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}. ${paper.title}. ${paper.year}.`,
        pdfUrl: paper.pdfUrl || ''
      }));
      
      // Update the brief with the references
      const references = replace ? newReferences : [...brief.references, ...newReferences];
      
      const updates = {
        references,
        updatedAt: new Date()
      };
      
      const count = await db.briefs.update(briefId, updates);
      
      console.log('[DB Operation] Updated brief with papers:', { 
        briefId, 
        paperCount: papers.length,
        replace,
        success: count > 0
      });
      
      return count > 0;
    });
  }

  /**
   * Finalize brief with AI-generated content
   */
  static async finalizeWithContent(briefId: string, content: string, refinedQuery?: string): Promise<boolean> {
    return await db.transaction('rw', db.briefs, async () => {
      const brief = await db.briefs.get(briefId);
      if (!brief) throw new Error(`Brief with id ${briefId} not found`);
      
      const updates: Partial<Brief> = {
        review: content,
        date: new Date(), // The completion date
        updatedAt: new Date()
      };
      
      // Update title if refined query is provided
      if (refinedQuery) {
        updates.title = refinedQuery.length > 50 
          ? refinedQuery.substring(0, 50) + '...' 
          : refinedQuery;
        updates.query = refinedQuery;
      }
      
      const count = await db.briefs.update(briefId, updates);
      
      console.log('[DB Operation] Finalized brief with content:', { 
        briefId,
        contentLength: content.length,
        updatedTitle: updates.title,
        success: count > 0
      });
      
      return count > 0;
    });
  }

  /**
   * Delete multiple briefs at once
   */
  static async deleteMany(briefIds: string[]): Promise<number> {
    return await db.transaction('rw', db.briefs, async () => {
      let deletedCount = 0;
      
      for (const id of briefIds) {
        const count = await db.briefs.where('id').equals(id).delete();
        deletedCount += count;
      }
      
      return deletedCount;
    });
  }

  /**
   * Delete all briefs
   */
  static async deleteAll(): Promise<number> {
    return await db.transaction('rw', db.briefs, async () => {
      // First count how many briefs we have
      const count = await db.briefs.count();
      
      // Then clear the table
      await db.briefs.clear();
      
      console.log('[DB Operation] Deleted all briefs:', { count });
      
      // Return the count of deleted items
      return count;
    });
  }
} 