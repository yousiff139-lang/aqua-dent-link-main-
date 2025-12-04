# Backend Environment Configuration

## ⚠️ IMPORTANT: Add Supabase Service Role Key

To create dentists (auth users), your backend needs the **Service Role Key**.

### How to Get Your Service Role Key

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **`service_role` key** (NOT the anon key)

### Add to `backend/.env`

Create or update `backend/.env` with:

```env
# Supabase Configuration - REQUIRED
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Node Configuration
NODE_ENV=development
PORT=3001

# JWT (optional)
JWT_SECRET=dentist-portal-secret-key-change-in-production-2024
```

### ⚠️ Security Warning

**NEVER commit `.env` to Git!** The service role key has **admin privileges**.

### After Adding the Key

1. Save `backend/.env`
2. Restart backend: `npm run dev` in backend folder
3. Try adding dentist again

That's it!
