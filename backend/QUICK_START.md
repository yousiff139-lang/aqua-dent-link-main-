# Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- Supabase project set up
- Database migrations applied

## Setup (5 minutes)

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
NODE_ENV=development
PORT=3001
API_PREFIX=/api

# Get these from your Supabase project settings
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

CORS_ORIGIN=http://localhost:8000,http://localhost:3010
LOG_LEVEL=info
```

### 3. Run Database Migrations

From the project root:

```bash
npx supabase db push
```

This creates:
- `slot_reservations` table
- `realtime_events` table
- Real-time triggers

### 4. Start the Server

```bash
npm run dev
```

You should see:

```
🚀 Server started successfully
  port: 3001
  environment: development
  apiPrefix: /api
```

## Testing

### 1. Health Check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-10-21T...",
  "uptime": 1.234,
  "checks": {
    "database": "ok"
  }
}
```

### 2. Get Auth Token

You need a Supabase auth token to test protected endpoints.

**Option A: From your frontend**
```javascript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

**Option B: Sign in via Supabase**
```bash
curl -X POST 'https://your-project.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'
```

### 3. Test API Endpoints

Replace `YOUR_TOKEN` with your actual token:

#### List Dentists
```bash
curl http://localhost:3001/api/profiles/dentists \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Get Available Slots
```bash
curl "http://localhost:3001/api/availability/DENTIST_ID/slots?date=2024-10-25" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Create Appointment
```bash
curl -X POST http://localhost:3001/api/appointments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dentist_id": "uuid-here",
    "appointment_date": "2024-10-25T10:00:00Z",
    "appointment_type": "Checkup"
  }'
```

#### Reserve a Slot
```bash
curl -X POST http://localhost:3001/api/availability/reserve \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dentist_id": "uuid-here",
    "slot_time": "2024-10-25T10:00:00Z"
  }'
```

## Common Issues

### Port Already in Use

If port 3001 is taken, change it in `.env`:

```env
PORT=3002
```

### Database Connection Failed

Check your Supabase credentials:
1. Go to Supabase Dashboard → Settings → API
2. Copy the correct URL and keys
3. Update `.env`

### Migrations Not Applied

Run migrations from project root:

```bash
npx supabase db push
```

### CORS Errors

Add your frontend URL to `CORS_ORIGIN` in `.env`:

```env
CORS_ORIGIN=http://localhost:8000,http://localhost:3010,http://localhost:5173
```

## Development Tips

### Watch Mode

The server auto-restarts on file changes:

```bash
npm run dev
```

### Check Logs

Logs are written to console and (in production) to files:
- `logs/error.log` - Errors only
- `logs/combined.log` - All logs

### Debug Mode

Set log level to debug in `.env`:

```env
LOG_LEVEL=debug
```

### Test Real-Time Triggers

1. Create an appointment via API
2. Check `realtime_events` table in Supabase:

```sql
SELECT * FROM realtime_events 
ORDER BY created_at DESC 
LIMIT 10;
```

You should see the broadcast event logged.

## Integration with Frontend

### Update API Base URL

In your frontend code:

```typescript
const API_BASE_URL = 'http://localhost:3001/api';

// Example: Create appointment
const response = await fetch(`${API_BASE_URL}/appointments`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(appointmentData),
});
```

### Subscribe to Real-Time Updates

```typescript
import { supabase } from './supabase';

// Subscribe to appointment changes
const subscription = supabase
  .channel('appointments')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'appointments',
      filter: `patient_id=eq.${userId}`,
    },
    (payload) => {
      console.log('Appointment updated:', payload);
      // Update your UI
    }
  )
  .subscribe();

// Cleanup
return () => {
  subscription.unsubscribe();
};
```

## Production Deployment

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

### Environment Variables

Set these in your hosting platform:
- `NODE_ENV=production`
- `PORT=3001`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CORS_ORIGIN` (your production domains)

### Recommended Hosting

- **Vercel**: Easy deployment, auto-scaling
- **Railway**: Simple setup, good for Node.js
- **Render**: Free tier available
- **AWS/GCP/Azure**: Full control

## Next Steps

1. ✅ Backend is running
2. 📱 Integrate with admin dashboard
3. 📱 Integrate with patient dashboard
4. 🤖 Integrate with chatbot
5. 🧪 Write integration tests
6. 🚀 Deploy to production

## Need Help?

- Check `backend/README.md` for detailed documentation
- Review `backend/IMPLEMENTATION_STATUS.md` for architecture
- See `.kiro/specs/realtime-sync-backend/` for full specification

Happy coding! 🚀
