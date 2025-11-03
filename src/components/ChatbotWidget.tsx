import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { chatbotService } from '@/services/chatbotService';
import { ChatbotResponse } from '@/types/chatbot';
import { useAuth } from '@/contexts/AuthContext';
import { useChatbotSync } from '@/services/chatbotRealtimeSync';
import { logger } from '@/utils/logger';

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
  options?: string[];
}

export const ChatbotWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize real-time sync for chatbot
  const { isConnected, error: syncError } = useChatbotSync({
    onAppointmentCreated: (appointment) => {
      logger.info('Chatbot: New appointment created via real-time sync', {
        appointmentId: appointment.id,
      });
      // Chatbot now has real-time visibility of all bookings
    },
    onAvailabilityUpdated: (dentistId, availability) => {
      logger.info('Chatbot: Availability updated via real-time sync', {
        dentistId,
        availability,
      });
      // Chatbot can now show updated availability instantly
    },
    onError: (error) => {
      logger.error('Chatbot real-time sync error', error);
    },
  });

  useEffect(() => {
    if (syncError) {
      logger.warn('Chatbot real-time sync error', { error: syncError });
    }
  }, [syncError]);

  const handleOpen = async () => {
    setIsOpen(true);
    
    // Start conversation for both authenticated and guest users
    if (messages.length === 0) {
      setIsLoading(true);
      try {
        // Get or create guest session ID
        let guestSessionId = localStorage.getItem('guest_session_id');
        if (!user && !guestSessionId) {
          guestSessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('guest_session_id', guestSessionId);
        }
        
        // Pass userId if user is logged in, otherwise undefined for guest session
        const response = await chatbotService.startConversation(user?.id);
        addBotMessage(response);
      } catch (error) {
        console.error('Error starting conversation:', error);
        addBotMessage({
          message: "I'm sorry, I couldn't start the conversation. Please try again.",
          state: 'error' as any,
          requiresInput: true,
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const addBotMessage = (response: ChatbotResponse) => {
    const botMessage: Message = {
      id: Date.now().toString(),
      text: response.message,
      sender: 'bot',
      timestamp: new Date(),
      options: response.options,
    };
    setMessages(prev => [...prev, botMessage]);
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    
    if (!messageText) return;
    
    // Generate or get session ID for guest users
    const sessionId = user?.id || `guest_${localStorage.getItem('guest_session_id') || Date.now()}`;
    
    // Store guest session ID in localStorage if not authenticated
    if (!user && !localStorage.getItem('guest_session_id')) {
      localStorage.setItem('guest_session_id', sessionId);
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Get bot response
    setIsLoading(true);
    try {
      // Use session ID (user ID if authenticated, guest ID if not)
      const response = await chatbotService.handleUserInput(sessionId, messageText);
      addBotMessage(response);
      
      // If the response indicates authentication is needed for booking
      if (response.state === 'error' && response.message?.includes('sign in')) {
        addBotMessage({
          message: "💡 Tip: You can sign in now and continue your booking. I'll remember what you told me!",
          state: 'error' as any,
          requiresInput: true,
        });
      }
    } catch (error: any) {
      console.error('Error handling input:', error);
      const errorMessage = error.message || "I'm sorry, something went wrong. Please try again.";
      
      // If it's an authentication error, provide helpful message
      if (errorMessage.includes('sign in') || errorMessage.includes('authenticated')) {
        addBotMessage({
          message: `${errorMessage}\n\nWould you like to sign in now to continue?`,
          state: 'error' as any,
          options: ['Yes, sign in', 'No, continue as guest'],
          requiresInput: true,
        });
      } else {
        addBotMessage({
          message: errorMessage,
          state: 'error' as any,
          requiresInput: true,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionClick = (option: string) => {
    handleSend(option);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg gradient-primary z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] flex flex-col shadow-2xl z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b gradient-primary text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <h3 className="font-semibold">Dental Assistant</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="text-white hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.sender === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              
              {/* Quick reply options */}
              {message.options && message.options.length > 0 && (
                <div className="mt-2 space-y-1">
                  {message.options.map((option, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => handleOptionClick(option)}
                      disabled={isLoading}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
};
