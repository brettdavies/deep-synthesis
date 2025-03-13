import type { AIServiceParams } from '@/lib/services/ai';

export enum MessageType {
  Brief = 'brief',
  Paper = 'paper',
  System = 'system'
}

interface Message {
  role: 'user' | 'system' | 'ai';
  content: string;
}

interface AIResponse {
  content: string;
  metadata?: Record<string, any>;
}

/**
 * Send a message to the AI service and get a response
 * @param type The type of message being sent
 * @param contextId The ID of the context (e.g. briefId)
 * @param messages Array of messages to send
 * @param params Optional AI service parameters
 * @returns Promise with the AI response
 */
export async function sendMessage(
  type: MessageType,
  contextId: string,
  messages: Message[],
  params?: Partial<AIServiceParams>
): Promise<AIResponse> {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        contextId,
        messages,
        params
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service responded with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending message to AI service:', error);
    throw error;
  }
} 