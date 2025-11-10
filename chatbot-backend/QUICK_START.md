# ⚡ Quick Start - Python Chatbot Backend

## 🚀 5-Minute Setup

### 1. Install (1 minute)

```bash
cd chatbot-backend
pip install -r requirements.txt
```

### 2. Configure (2 minutes)

```bash
cp .env.example .env
```

Edit `.env` and add:
- `GEMINI_API_KEY` - Get from https://makersuite.google.com/app/apikey
- `DATABASE_URL` - Your Supabase PostgreSQL URL
- `SUPABASE_SERVICE_KEY` - From Supabase Dashboard → Settings → API

### 3. Create Tables (1 minute)

Run in Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES auth.users(id),
    messages JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.xray_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    file_path TEXT,
    analysis TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Start (1 minute)

```bash
# Windows
start.bat

# Linux/Mac
chmod +x start.sh && ./start.sh
```

## ✅ Test It

Open: http://localhost:8000/docs

Try:
```bash
curl -X POST http://localhost:8000/chat \
  -F "user_id=test-user" \
  -F "message=Hello"
```

## 🔗 Integrate with Frontend

Add to `.env`:
```env
VITE_CHATBOT_API_URL=http://localhost:8000
```

Create `src/services/chatbotService.ts`:
```typescript
export async function sendMessage(message: string) {
  const response = await fetch('http://localhost:8000/chat', {
    method: 'POST',
    body: new FormData({
      user_id: currentUser.id,
      message: message
    })
  });
  return response.json();
}
```

## 📚 Full Docs

- **README.md** - Complete guide
- **INTEGRATION_GUIDE.md** - Frontend integration
- **API Docs** - http://localhost:8000/docs

## 🎉 Done!

Your AI chatbot backend is running! 🤖✨
