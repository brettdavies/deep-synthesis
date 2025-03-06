import React from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type MessageRole = "ai" | "user";

type Message = { 
  role: MessageRole; 
  content: string;
  editable?: boolean;
};

interface MessageListProps {
  messages: Message[];
  onEditMessage?: (index: number, newContent: string) => void;
  isLoading?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, onEditMessage, isLoading = false }) => {
  const handleEdit = (index: number, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onEditMessage) {
      onEditMessage(index, e.target.value);
    }
  };

  // Function to process message content - remove SUGGESTED QUERY from latest AI message
  const processMessageContent = (content: string, isAI: boolean, isLatestAI: boolean) => {
    if (isAI && isLatestAI) {
      // Remove the SUGGESTED QUERY line from the latest AI message
      return content.replace(/SUGGESTED QUERY:.*?(?=\n\n|\n$|$)/i, '').trim();
    }
    return content;
  };

  // Find the index of the latest AI message
  const latestAIMessageIndex = [...messages].reverse().findIndex(m => m.role === "ai");
  const latestAIIndex = latestAIMessageIndex !== -1 ? messages.length - 1 - latestAIMessageIndex : -1;

  return (
    <div className="space-y-3">
      {messages.map((message, index) => {
        const isLatestAI = message.role === "ai" && index === latestAIIndex;
        const processedContent = processMessageContent(message.content, message.role === "ai", isLatestAI);
        
        return (
          <div 
            key={index} 
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "user" ? (
              // User message
              <div className="flex items-start max-w-[80%]">
                <div className="bg-blue-500 rounded-2xl rounded-tr-none py-3 px-4 text-white">
                  <div className="whitespace-pre-wrap">{processedContent}</div>
                </div>
                <Avatar className="h-8 w-8 ml-2 mt-1 bg-blue-500 flex items-center justify-center text-white">
                  <span className="text-xs font-medium">U</span>
                </Avatar>
              </div>
            ) : (
              // AI message
              <div className="flex items-start max-w-[80%]">
                <Avatar className="h-8 w-8 mr-2 mt-1 bg-blue-500 flex items-center justify-center text-white">
                  <span className="text-xs font-medium">AI</span>
                </Avatar>
                <div className="bg-gray-100 rounded-2xl rounded-tl-none py-3 px-4">
                  {message.editable ? (
                    <textarea 
                      className="w-full min-h-[100px] p-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      value={message.content}
                      onChange={(e) => handleEdit(index, e)}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap">{processedContent}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {isLoading && (
        <div className="flex justify-center mt-4">
          <div className="bg-gray-800 text-white rounded-lg py-2 px-4 flex items-center">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            <span>Processing your response. This may take a moment...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList; 