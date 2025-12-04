import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Upload, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { chatbotService } from '@/services/chatbotService';
import { ChatbotResponse } from '@/types/chatbot';
import { useAuth } from '@/contexts/AuthContext';
import { useChatbotSync } from '@/services/chatbotRealtimeSync';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
  options?: string[];
  showFileUpload?: boolean;
}

export const ChatbotWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      showFileUpload: response.showFileUpload,
    };
    setMessages(prev => [...prev, botMessage]);
    // Show file upload UI if needed
    if (response.showFileUpload) {
      setShowFileUpload(true);
    }
  };

  const handleSend = async (text?: string) => {
    let messageText = text || input.trim();

    if (!messageText && uploadedFiles.length === 0) return;

    // Generate or get session ID for guest users
    const sessionId = user?.id || `guest_${localStorage.getItem('guest_session_id') || Date.now()}`;

    // Store guest session ID in localStorage if not authenticated
    if (!user && !localStorage.getItem('guest_session_id')) {
      localStorage.setItem('guest_session_id', sessionId);
    }

    // Upload files if any
    if (uploadedFiles.length > 0) {
      try {
        const uploadPromises = uploadedFiles.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${sessionId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('medical_documents')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('medical_documents')
            .getPublicUrl(fileName);

          return publicUrl;
        });

        const urls = await Promise.all(uploadPromises);
        messageText += `\n\n[Uploaded Files]:\n${urls.join('\n')}`;

        setUploadedFiles([]); // Clear files after upload
        setShowFileUpload(false); // Hide upload UI
      } catch (error) {
        console.error('Error uploading files:', error);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: "Failed to upload files. Please try again.",
          sender: 'bot',
          timestamp: new Date(),
        }]);
        setIsLoading(false);
        return;
      }
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);

    // Validate file types
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const validFiles = newFiles.filter(file => allowedTypes.includes(file.type));

    if (validFiles.length !== newFiles.length) {
      addBotMessage({
        message: "Some files were rejected. Only PDF, JPG, and PNG files are allowed.",
        state: 'error' as any,
        requiresInput: true,
      });
    }

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
      addBotMessage({
        message: `✅ ${validFiles.length} file(s) uploaded successfully! You can upload more or continue with your booking.`,
        state: 'awaiting_medical_history' as any,
        requiresInput: true,
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
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
              className={`max-w-[80%] rounded-lg p-3 ${message.sender === 'user'
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

              {/* File upload section */}

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
      <div className="border-t">
        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="p-3 pb-0 space-y-1 max-h-32 overflow-y-auto">
            {uploadedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs bg-muted p-2 rounded">
                <div className="flex items-center gap-2">
                  <File className="h-3 w-3" />
                  <span className="truncate max-w-[240px]">{file.name}</span>
                  <span className="text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeFile(idx)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-4 flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />

          {/* Upload Button - Always visible, enabled only when showFileUpload is true */}
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={!showFileUpload}
            onClick={() => fileInputRef.current?.click()}
            className={`transition-all ${showFileUpload
              ? 'opacity-100 cursor-pointer hover:bg-accent'
              : 'opacity-30 cursor-not-allowed'
              }`}
            title={showFileUpload ? 'Upload documents (PDF, JPG, PNG)' : 'Upload will be available during medical history'}
          >
            <Upload className="h-4 w-4" />
          </Button>

          <Button type="submit" size="icon" disabled={isLoading || (!input.trim() && uploadedFiles.length === 0)}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
};
