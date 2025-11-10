# 🔗 Frontend Integration Guide

## Overview

This guide shows how to integrate the Python chatbot backend with your existing React/TypeScript frontend.

## 🚀 Quick Setup

### 1. Start the Chatbot Backend

```bash
cd chatbot-backend
python start.bat  # Windows
# or
./start.sh        # Linux/Mac
```

Backend will run on: `http://localhost:8000`

### 2. Update Frontend Environment

Add to your `.env` file:

```env
VITE_CHATBOT_API_URL=http://localhost:8000
```

### 3. Create Chatbot Service

Create `src/services/chatbotService.ts`:

```typescript
import { supabase } from '@/integrations/supabase/client';

const CHATBOT_API_URL = import.meta.env.VITE_CHATBOT_API_URL || 'http://localhost:8000';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  success: boolean;
  reply: string;
  user_name: string;
  intent: string;
  confidence: number;
  timestamp: string;
}

export interface XRayAnalysisResponse {
  success: boolean;
  analysis: string;
  file_path: string;
  upload_id: string;
  timestamp: string;
}

export class ChatbotService {
  /**
   * Send message to chatbot
   */
  async sendMessage(message: string): Promise<ChatResponse> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const formData = new FormData();
    formData.append('user_id', user.id);
    formData.append('message', message);

    const response = await fetch(`${CHATBOT_API_URL}/chat`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response.json();
  }

  /**
   * Upload and analyze X-ray
   */
  async uploadXRay(file: File, query?: string): Promise<XRayAnalysisResponse> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', user.id);
    if (query) {
      formData.append('query', query);
    }

    const response = await fetch(`${CHATBOT_API_URL}/upload_xray`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload X-ray');
    }

    return response.json();
  }

  /**
   * Get user appointments
   */
  async getAppointments(limit: number = 10) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${CHATBOT_API_URL}/appointments/${user.id}?limit=${limit}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch appointments');
    }

    return response.json();
  }

  /**
   * Get available dentists
   */
  async getDentists(specialization?: string) {
    const url = specialization
      ? `${CHATBOT_API_URL}/dentists?specialization=${encodeURIComponent(specialization)}`
      : `${CHATBOT_API_URL}/dentists`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch dentists');
    }

    return response.json();
  }

  /**
   * Classify user intent
   */
  async classifyIntent(message: string) {
    const formData = new FormData();
    formData.append('message', message);

    const response = await fetch(`${CHATBOT_API_URL}/intent/classify`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to classify intent');
    }

    return response.json();
  }
}

export const chatbotService = new ChatbotService();
```

## 💬 Chat Component Example

Create `src/components/ChatbotWidget.tsx`:

```typescript
import { useState, useEffect, useRef } from 'react';
import { chatbotService, ChatMessage } from '@/services/chatbotService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, Upload, X } from 'lucide-react';

export function ChatbotWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatbotService.sendMessage(input);
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.reply,
        timestamp: response.timestamp,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    try {
      const response = await chatbotService.uploadXRay(file);
      
      const analysisMessage: ChatMessage = {
        role: 'assistant',
        content: `X-Ray Analysis:\n\n${response.analysis}`,
        timestamp: response.timestamp,
      };

      setMessages(prev => [...prev, analysisMessage]);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 rounded-full w-14 h-14"
      >
        💬
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[600px] flex flex-col shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Dental Assistant</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm">Typing...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <label htmlFor="file-upload">
            <Button variant="outline" size="icon" asChild>
              <span>
                <Upload className="w-4 h-4" />
              </span>
            </Button>
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".png,.jpg,.jpeg,.pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button onClick={handleSend} disabled={isLoading}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
```

## 🎯 Usage in Your App

### Add to Main Layout

In `src/App.tsx` or your main layout:

```typescript
import { ChatbotWidget } from '@/components/ChatbotWidget';

function App() {
  return (
    <div>
      {/* Your existing app */}
      <ChatbotWidget />
    </div>
  );
}
```

### Add to Dentist Profile Page

In `src/pages/DentistProfile.tsx`:

```typescript
import { chatbotService } from '@/services/chatbotService';

// Inside component
const handleBookWithChatbot = async () => {
  // Open chatbot with context
  const message = `I want to book an appointment with ${dentist.name}`;
  // Send initial message
  await chatbotService.sendMessage(message);
};

// In JSX
<Button onClick={handleBookWithChatbot}>
  Book with AI Assistant
</Button>
```

## 🧪 Testing

### Test Chat Endpoint

```typescript
// In browser console
const response = await fetch('http://localhost:8000/chat', {
  method: 'POST',
  body: new FormData({
    user_id: 'your-user-id',
    message: 'I have tooth pain'
  })
});
console.log(await response.json());
```

### Test X-Ray Upload

```typescript
// In your component
const testUpload = async () => {
  const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
  const result = await chatbotService.uploadXRay(file, 'Is there a cavity?');
  console.log(result);
};
```

## 🔧 Configuration

### CORS Setup

The backend is already configured to accept requests from:
- `http://localhost:5174` (Public site)
- `http://localhost:3010` (Admin)
- `http://localhost:3011` (Dentist portal)

To add more origins, update `chatbot-backend/.env`:

```env
CORS_ORIGINS=http://localhost:5174,http://localhost:3010,http://localhost:3011,https://yourdomain.com
```

### API URL

For production, update the API URL:

```env
# Development
VITE_CHATBOT_API_URL=http://localhost:8000

# Production
VITE_CHATBOT_API_URL=https://api.yourdomain.com
```

## 📊 Monitoring

### Check Backend Health

```typescript
const checkHealth = async () => {
  const response = await fetch('http://localhost:8000/health');
  const data = await response.json();
  console.log('Backend status:', data.status);
};
```

### View Logs

Backend logs are stored in `chatbot-backend/logs/chatbot.log`

## 🚀 Deployment

### Deploy Backend

1. **Heroku**:
```bash
cd chatbot-backend
heroku create your-app-name
git push heroku main
```

2. **Railway**:
```bash
railway init
railway up
```

3. **Docker**:
```bash
docker build -t chatbot-backend .
docker run -p 8000:8000 --env-file .env chatbot-backend
```

### Update Frontend

After deploying backend, update `.env`:

```env
VITE_CHATBOT_API_URL=https://your-backend-url.com
```

## 🎉 Complete!

Your chatbot backend is now integrated with your frontend. Users can:

- ✅ Chat with AI assistant
- ✅ Upload X-rays for analysis
- ✅ Book appointments
- ✅ Get dentist recommendations
- ✅ View their appointments
- ✅ Get dental advice

---

**Need Help?** Check the main README.md or backend logs for troubleshooting.
