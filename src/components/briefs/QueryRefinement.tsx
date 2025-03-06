import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useLLM } from '@/lib/llm/use-llm';
import MessageList from './MessageList';
import { ArrowLeft, ArrowRight, Send } from 'lucide-react';

// Constants
const MessageRoles = {
  USER: 'user' as MessageRole,
  AI: 'ai' as MessageRole
};

type MessageRole = "ai" | "user";

// Interfaces
type Message = { role: MessageRole; content: string };

interface QueryRefinementProps {
  initialQuery: string;
  onQueryRefined: (refinedQuery: string) => void;
  onBack?: () => void;
}

// Component
const QueryRefinement: React.FC<QueryRefinementProps> = ({
  initialQuery,
  onQueryRefined,
  onBack
}) => {
  const [aiMessages, setAiMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [finalQuery, setFinalQuery] = useState('');
  
  const { completeWithAI, loading } = useLLM();

  // Ref to prevent duplicate calls in StrictMode
  const initialPromptCalled = useRef(false);

  // Initialize the conversation with AI
  useEffect(() => {
    if (initialQuery && aiMessages.length === 0 && !initialPromptCalled.current) {
      initialPromptCalled.current = true;
      handleInitialPrompt();
    }
  }, [initialQuery]);

  const handleInitialPrompt = async () => {
    setIsLoading(true);
    // Remove the toast notification
    try {
      const prompt = `
        You are a research assistant helping to refine a research query. Your goal is to help the user clarify their research interests before searching for relevant papers on arXiv.
        
        Initial Query: ${initialQuery}
        
        Please ask thoughtful follow-up questions to help refine this query. Focus on:
        1. Clarifying specific sub-topics of interest
        2. Identifying relevant methodologies
        3. Establishing timeframe considerations
        4. Understanding the academic context
        
        Ask only 1-2 questions at a time to keep the conversation focused. Be conversational but focused on academic precision.
        
        IMPORTANT: At the end of your response, always include a line with "SUGGESTED QUERY: [your suggested refined query based on information so far]" 
        Even if you're still gathering information, provide a refined version of the query that represents your best suggestion given what you know so far.
      `;
      
      const response = await completeWithAI('openai', prompt).then(res => res.content);
      
      // Extract the final query when it exists
      const queryMatch = response.match(/SUGGESTED QUERY:\s*(.+?)(?=\n\n|\n$|$)/i);
      if (queryMatch && queryMatch[1]) {
        setFinalQuery(queryMatch[1].trim());
      }
      
      setAiMessages([
        { role: MessageRoles.USER, content: initialQuery },
        { role: MessageRoles.AI, content: response }
      ]);
    } catch (error) {
      console.error('AI conversation error:', error);
      
      // Show appropriate error message inside the chat instead of toast
      setAiMessages([
        { role: MessageRoles.USER, content: initialQuery },
        { role: MessageRoles.AI, content: "I encountered an error processing your query. Let's try again." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUserResponse = async () => {
    if (!userInput.trim()) return;
    
    // Add user message to conversation
    const updatedMessages = [
      ...aiMessages, 
      { role: MessageRoles.USER, content: userInput }
    ];
    setAiMessages(updatedMessages);
    setUserInput('');
    setIsLoading(true);
    
    // Remove the toast here too
    try {
      // Create prompt with conversation history
      const history = updatedMessages.map(msg => 
        `${msg.role === MessageRoles.USER ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n\n');
      
      const prompt = `
        You are a research assistant helping to refine a research query through conversation. Your goal is to help the user clarify their research interests before searching for relevant papers.
        
        Here is the conversation history:
        ${history}
        
        Continue the conversation by responding to the user's last message. Ask 1-2 focused follow-up questions that help refine the research query. Focus on:
        1. Clarifying specific sub-topics of interest
        2. Identifying relevant methodologies 
        3. Establishing timeframe considerations
        4. Understanding the academic context
        
        Be conversational but focused on academic precision. 
        
        IMPORTANT: At the end of your response, always include a line with "SUGGESTED QUERY: [your suggested refined query based on the conversation so far]"
        Even if more clarification is needed, provide your best suggestion for a refined query based on what you know so far.
      `;
      
      const response = await completeWithAI('openai', prompt).then(res => res.content);
      
      // Extract the final query when it exists
      const queryMatch = response.match(/SUGGESTED QUERY:\s*(.+?)(?=\n\n|\n$|$)/i);
      if (queryMatch && queryMatch[1]) {
        setFinalQuery(queryMatch[1].trim());
      }
      
      setAiMessages([...updatedMessages, { role: MessageRoles.AI, content: response }]);
    } catch (error) {
      console.error('AI conversation error:', error);
      
      // Add error message to the conversation instead of showing toast
      setAiMessages([
        ...updatedMessages,
        { role: MessageRoles.AI, content: "I encountered an error processing your response. Please try again." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Allow user to edit previous messages
  const handleEditMessage = (index: number, newContent: string) => {
    if (index % 2 !== 0) return; // Only allow editing user messages
    
    const newMessages = [...aiMessages];
    newMessages[index].content = newContent;
    
    // Truncate conversation to remove AI responses after the edited message
    setAiMessages(newMessages.slice(0, index + 1));
    
    // Auto-send after edit
    setUserInput('');
    setTimeout(() => {
      handleUserResponse();
    }, 100);
  };
  
  // Let user decide when to finalize
  const handleFinalize = () => {
    // If user has set a specific query in the input, use that
    const queryToUse = userInput.trim() ? 
      userInput : 
      finalQuery || aiMessages[aiMessages.length - 1]?.content || initialQuery;
    
    onQueryRefined(queryToUse);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUserResponse();
    }
  };
  
  const handleStartRefinement = () => {
    // Reset
    setAiMessages([]);
    initialPromptCalled.current = false;
    handleInitialPrompt();
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Refine Your Research Query</CardTitle>
        <CardDescription>
          Chat with our AI assistant to refine your research query and identify key aspects to focus on.
        </CardDescription>
      </CardHeader>
      
      {/* Fixed height container with flex layout */}
      <div className="flex flex-col h-[600px]">
        {/* Scrollable area for messages only */}
        <div className="flex-1 overflow-y-auto px-6">
          <MessageList 
            messages={aiMessages} 
            onEditMessage={handleEditMessage}
            isLoading={isLoading} 
          />
        </div>
        
        {/* Fixed response area at bottom */}
        <div className="p-6 border-t bg-card">
          {finalQuery && (
            <div className="w-full p-3 mb-4 bg-muted rounded-md">
              <p className="text-sm font-medium">Suggested Query:</p>
              <p className="text-md">{finalQuery}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click Continue to proceed with this suggested query.
              </p>
            </div>
          )}
          
          <div className="flex items-end gap-2">
            <Textarea
              placeholder="Type your response..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyPress}
              className="min-h-[80px] resize-none"
              disabled={isLoading}
            />
            <Button 
              variant="secondary"
              className="flex-shrink-0 px-4 h-12"
              disabled={isLoading || !userInput.trim()}
              onClick={handleUserResponse}
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </div>
          
          <div className="flex justify-between mt-4">
            <Button variant="outline" onClick={onBack} disabled={isLoading}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={handleFinalize} disabled={isLoading || !finalQuery}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default QueryRefinement; 