import { useState, useEffect, useRef, useCallback } from 'react';
import type { Brief, ChatMessage } from '@/lib/db/schema/brief';
import type { BriefEditStep, StepProps } from './types';
import { registerStep } from './registry';
import { BriefOperations } from '@/lib/db/operations/briefs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useStepLogic } from './useStepLogic';
import { useLLM } from '@/lib/llm/use-llm';
import { getInitialPrompt, getFollowUpPrompt, formatConversationHistory } from './RefinementStepPrompts';

interface ChatMessageDisplay extends ChatMessage {
  pending?: boolean;
}

function RefinementStepComponent({ briefId, onComplete, onBack }: StepProps) {
  // Use the shared step logic
  const { brief, isLoading, setIsLoading, handleError, updateBrief } = useStepLogic(briefId);
  // Get the LLM functionality
  const { completeWithAI } = useLLM();
  
  const [userMessage, setUserMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessageDisplay[]>([]);
  const [refinedQuery, setRefinedQuery] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Initialize chat messages from brief or set a system message
  useEffect(() => {
    if (brief?.chatMessages && brief.chatMessages.length > 0) {
      console.log('[RefinementStep] Loading existing chat messages:', {
        messageCount: brief.chatMessages.length
      });
      setMessages(brief.chatMessages);
      
      // Extract the latest refined query from the most recent AI message
      const aiMessages = brief.chatMessages.filter(msg => msg.role === 'ai');
      if (aiMessages.length > 0) {
        const latestAiMsg = aiMessages[aiMessages.length - 1];
        const queryMatch = latestAiMsg.content.match(/REFINED QUERY:\s*(.+?)(?=\n\n|\n$|$)/i);
        if (queryMatch && queryMatch[1]) {
          setRefinedQuery(queryMatch[1].trim());
        } else {
          // Fallback to the brief's query if no refined query is found
          setRefinedQuery(brief.query);
        }
      } else {
        setRefinedQuery(brief.query);
      }
    } else if (brief?.query) {
      console.log('[RefinementStep] No chat messages found, creating initial AI message for query:', {
        query: brief.query
      });
      
      // Initial state with query but no messages
      setRefinedQuery(brief.query);
      
      // No existing messages but we have a query, set an initial message
      const initialMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: '',  // Will be filled below
        timestamp: new Date()
      };

      // Immediately initiate AI conversation when component mounts
      (async () => {
        try {
          setIsLoading(true);
          setIsAiResponding(true);
          const prompt = getInitialPrompt(brief.query);
          const response = await completeWithAI('openai', prompt, { temperature: 0.7 });
          
          // Extract suggested query if present
          const queryMatch = response.content.match(/REFINED QUERY:\s*(.+?)(?=\n\n|\n$|$)/i);
          if (queryMatch && queryMatch[1]) {
            const extractedQuery = queryMatch[1].trim();
            setRefinedQuery(extractedQuery);
          }
          
          initialMessage.content = response.content;
          setMessages([initialMessage]);
          
          // Also save it to the database so it persists
          console.log('[RefinementStep] Saving initial AI message to database:', {
            initialMessage,
            briefId
          });
          
          // Make sure we're passing a clean ChatMessage without any extra properties
          const cleanMessage: ChatMessage = {
            id: initialMessage.id,
            role: initialMessage.role,
            content: initialMessage.content,
            timestamp: initialMessage.timestamp
          };
          
          await updateBrief({ 
            chatMessages: [cleanMessage] 
          });
          
        } catch (error) {
          handleError(error);
          // Provide a fallback message in the UI only (not saved to DB)
          const errorMessage: ChatMessageDisplay = {
            id: `error-${Date.now()}`,
            role: 'ai',
            content: "I encountered an issue connecting to the AI service. Please try refreshing the page or start the conversation with your additional details.",
            timestamp: new Date(),
          };
          setMessages([errorMessage]);
        } finally {
          setIsLoading(false);
          setIsAiResponding(false);
        }
      })();
    }
  }, [brief, updateBrief]);
  
  // Scroll to bottom of messages when they change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Update refined query when messages change
  useEffect(() => {
    // Only run if there are messages and the last message is from AI
    if (messages.length > 0 && messages[messages.length - 1].role === 'ai' && !messages[messages.length - 1].pending) {
      const lastAiMessage = messages[messages.length - 1];
      const queryMatch = lastAiMessage.content.match(/REFINED QUERY:\s*(.+?)(?=\n\n|\n$|$)/i);
      if (queryMatch && queryMatch[1]) {
        setRefinedQuery(queryMatch[1].trim());
      }
    }
  }, [messages]);
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (!userMessage.trim() || isAiResponding || !brief) return;
    
    const userMsg: ChatMessageDisplay = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    
    // Add user message to UI immediately
    setMessages(prev => [...prev, userMsg]);
    setUserMessage('');
    
    try {
      setIsLoading(true);
      setIsAiResponding(true);
      
      // Create a pending AI message to show typing indicator
      const pendingAiMsg: ChatMessageDisplay = {
        id: `pending-${Date.now()}`,
        role: 'ai',
        content: '',
        timestamp: new Date(),
        pending: true
      };
      
      setMessages(prev => [...prev, pendingAiMsg]);
      
      // Save only the user message to database
      const updatedMessages = [...messages.filter(m => !m.pending), userMsg];
      
      console.log('[RefinementStep] Saving user message to database:', {
        updatedMessages,
        briefId
      });
      
      await updateBrief({ 
        chatMessages: updatedMessages 
      });
      
      // Prepare conversation history for the prompt
      const history = formatConversationHistory(updatedMessages);
      
      // Call the AI endpoint with the follow-up prompt
      const prompt = getFollowUpPrompt(history);
      const aiResponse = await completeWithAI('openai', prompt, { temperature: 0.7 });
      
      // Extract suggested query if present
      const queryMatch = aiResponse.content.match(/REFINED QUERY:\s*(.+?)(?=\n\n|\n$|$)/i);
      if (queryMatch && queryMatch[1]) {
        const extractedQuery = queryMatch[1].trim();
        setRefinedQuery(extractedQuery);
      }
      
      // Create real AI message
      const aiMsg: ChatMessageDisplay = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: aiResponse.content,
        timestamp: new Date()
      };
      
      // Replace pending message with real one
      setMessages(prev => [...prev.filter(m => !m.pending), aiMsg]);
      
      // Update brief with the new messages including AI response
      const finalMessages = [...updatedMessages, aiMsg];
      
      console.log('[RefinementStep] Saving AI response to database:', {
        finalMessages,
        briefId,
        messageCount: finalMessages.length
      });
      
      // Ensure we're working with valid ChatMessage objects without the pending property
      const cleanMessages = finalMessages.map(({ id, role, content, timestamp }) => ({
        id, role, content, timestamp
      }));
      
      await updateBrief({
        chatMessages: cleanMessages
      });
      
    } catch (error) {
      handleError(error);
      
      // Remove pending message
      setMessages(prev => prev.filter(m => !m.pending));
      
      // Add error message to UI only (not saved to DB)
      const errorMsg: ChatMessageDisplay = {
        id: `error-${Date.now()}`,
        role: 'ai',
        content: "I encountered an error processing your message. Please try again.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev.filter(m => !m.pending), errorMsg]);
    } finally {
      setIsLoading(false);
      setIsAiResponding(false);
    }
  };
  
  // Handle saving the refined query
  const handleSaveRefinedQuery = async () => {
    if (!refinedQuery.trim()) {
      toast.error("Please enter a refined query");
      return;
    }
    
    // Create a system message to mark the step as completed
    const completionMessage: ChatMessage = {
      id: `system-${Date.now()}`,
      role: 'ai', // Using 'ai' role for compatibility 
      content: `__REFINEMENT_COMPLETE__: User saved refined query: "${refinedQuery.trim()}"`,
      timestamp: new Date()
    };
    
    // Get existing messages or empty array
    const existingMessages = brief?.chatMessages || [];
    
    // Only add the completion message if it doesn't exist already
    const hasCompletionMessage = existingMessages.some(msg => 
      msg.content.includes('__REFINEMENT_COMPLETE__')
    );
    
    // Update the chat messages with our completion marker
    const updatedMessages = hasCompletionMessage 
      ? existingMessages 
      : [...existingMessages, completionMessage];
    
    // Save both the refined query and updated chat messages
    const success = await updateBrief({
      query: refinedQuery.trim(),
      title: refinedQuery.length > 50 ? refinedQuery.substring(0, 50) + '...' : refinedQuery,
      chatMessages: updatedMessages
    });
    
    if (success) {
      toast.success("Refined query saved");
      onComplete();
    }
  };
  
  // When enter is pressed in textarea, send message
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);
  
  if (!brief) {
    return <div className="animate-pulse h-32"></div>;
  }
  
  return (
    <div className="refinement-step">
      <h2 className="text-2xl font-bold mb-4">Refine Your Research Question</h2>
      <p className="text-muted-foreground mb-6">
        Chat with AI to refine your research question. Once you're satisfied,
        update your refined question below and continue.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chat section */}
        <div className="flex flex-col h-[600px]">
          <Card className="flex-1 mb-4 overflow-hidden">
            <CardContent className="p-4 h-full overflow-y-auto">
              <div className="space-y-4">
                {messages.map((message, index) => {
                  // Don't display the REFINED QUERY in the latest AI message
                  let content = message.content;
                  if (message.role === 'ai' && index === messages.length - 1) {
                    // Remove REFINED QUERY from the displayed message
                    content = content.replace(/REFINED QUERY:\s*(.+?)(?=\n\n|\n$|$)/i, '');
                  }
                  
                  return (
                    <div 
                      key={message.id} 
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        } ${message.pending ? 'opacity-50' : ''}`}
                      >
                        {content}
                        {message.pending && 
                          <div className="flex items-center mt-2">
                            <div className="h-3 w-3 rounded-full bg-primary/30 animate-pulse mr-1"></div>
                            <div className="h-3 w-3 rounded-full bg-primary/30 animate-pulse mr-1" style={{ animationDelay: '0.2s' }}></div>
                            <div className="h-3 w-3 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                        }
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </CardContent>
          </Card>
          
          <div className="flex gap-2">
            <Textarea
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isAiResponding ? "AI is responding..." : "Type your message..."}
              className={`flex-1 ${isAiResponding ? "bg-gray-50" : ""}`}
              disabled={isAiResponding || isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!userMessage.trim() || isAiResponding || isLoading}
              className={isAiResponding ? "opacity-70" : ""}
            >
              {isAiResponding ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin mr-2"></div>
                  Wait
                </>
              ) : "Send"}
            </Button>
          </div>
          
          {/* Overlay message when AI is responding */}
          {isAiResponding && (
            <div className="text-center text-amber-700 bg-amber-50 p-2 rounded-md mt-2 font-medium text-sm">
              AI is thinking... Please wait while the response is being generated.
            </div>
          )}
        </div>
        
        {/* Refined query section */}
        <div>
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-2">Original Query:</h3>
              <p className="p-2 bg-muted rounded mb-4">{brief.query}</p>
              
              <Separator className="my-4" />
              
              <h3 className="font-medium mb-2">Refined Query:</h3>
              <p className="p-2 bg-muted rounded mb-4">{refinedQuery}</p>
              
              <div className="flex justify-between">
                {onBack && (
                  <Button 
                    variant="outline" 
                    onClick={onBack}
                    disabled={isAiResponding || isLoading}
                  >
                    Back
                  </Button>
                )}
                <Button 
                  onClick={handleSaveRefinedQuery}
                  disabled={!refinedQuery.trim() || isAiResponding || isLoading}
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Define step completion criteria based on brief data
function isStepComplete(brief: Brief): boolean {
  // Check if there are chat messages with our completion marker
  const isExplicitlyComplete = brief.chatMessages?.some(msg => 
    msg.content.includes('__REFINEMENT_COMPLETE__')
  ) || false;
  
  // For debugging
  console.log('[RefinementStep] isStepComplete:', {
    isExplicitlyComplete,
    chatMessagesExist: !!brief.chatMessages,
    chatMessagesLength: brief.chatMessages?.length || 0
  });
  
  return isExplicitlyComplete;
}

// Export the step definition
export const RefinementStep: BriefEditStep = {
  id: 'refinement',
  title: 'Refine Query',
  description: 'Improve your research question with AI assistance',
  component: RefinementStepComponent,
  isComplete: isStepComplete
};

// Do NOT register the step here - it will be registered by the registry
// export default for convenience
export default RefinementStep; 