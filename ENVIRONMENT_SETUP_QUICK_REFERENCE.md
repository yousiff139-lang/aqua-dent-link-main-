# Environment Variables - Quick Reference

This is a quick reference guide for setting up the essential environment variables. For comprehensive documentation, see [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md).

## 🚨 Critical Variables (MUST Configure)

### VITE_SUPABASE_URL

**What it is:** Your Supabase project's API endpoint URL

**Format:** `https://[project-id].supabase.co`

**Where to get it:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Settings → API → Copy "Project URL"

**Add to these files:**
- `.env` (User Website)
- `dentist-portal/.env`
- `admin-app/.env`
- `backend/.env` (as `SUPABASE_URL`)

---

### VITE_SUPABASE_PUBLISHABLE_KEY

**What it is:** Your Supabase project's public/anonymous API key (safe for frontend)

**Format:** JWT token starting with `eyJhbGc...`

**Where to get it:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Settings → API → Copy "anon public" key

**Add to these files:**
- `.env` (User Website) as `VITE_SUPABASE_PUBLISHABLE_KEY`
- `dentist-portal/.env` as `VITE_SUPABASE_ANON_KEY`
- `admin-app/.env` as `VITE_SUPABASE_PUBLISHABLE_KEY`
- `backend/.env` as `SUPABASE_ANON_KEY`

---

## 30-Second Setup

```bash
# 1. Copy example files
cp .env.example .env
cp backend/.env.example backend/.env
cp dentist-portal/.env.example dentist-portal/.env
cp admin-app/.env.example admin-app/.env

# 2. Get Supabase credentials
# Visit: https://supabase.com/dashboard/project/_/settings/api

# 3. Update all .env files with:
#    - VITE_SUPABASE_URL (same value in all files)
#    - VITE_SUPABASE_PUBLISHABLE_KEY / ANON_KEY (same value in all files)

# 4. Start the apps
npm run dev                    # User Website
cd backend && npm run dev      # Backend API
cd dentist-portal && npm run dev  # Dentist Portal
```

---

## What Breaks Without These Variables?

### Without VITE_SUPABASE_URL:
- ❌ Cannot connect to database
- ❌ All API calls fail
- ❌ "Network error" or "Connection refused" messages

### Without VITE_SUPABASE_PUBLISHABLE_KEY:
- ❌ Authentication fails (cannot login/signup)
- ❌ Database queries return "schema cache" errors
- ❌ Dentist profiles show blank pages
- ❌ Appointments cannot be created
- ❌ "Unauthorized" or "Invalid API key" errors

---

## Verification Checklist

After setting up environment variables:

- [ ] User Website starts without errors (`npm run dev`)
- [ ] Backend API starts without errors (`cd backend && npm run dev`)
- [ ] Dentist Portal starts without errors (`cd dentist-portal && npm run dev`)
- [ ] Can login/signup on User Website
- [ ] Dentist profiles load with data (not blank)
- [ ] Can view list of dentists
- [ ] No "schema cache" errors in browser console
- [ ] No "Invalid API key" errors in browser console

---

## Common Issues

### Issue: "relation 'public.appointment' does not exist"
**Cause:** Wrong table name in code (should be `appointments` plural)
**Solution:** This is a code issue, not environment variable issue. See [booking-system-critical-fixes spec](./.kiro/specs/booking-system-critical-fixes/)

### Issue: "Invalid API key"
**Cause:** Wrong or missing `VITE_SUPABASE_PUBLISHABLE_KEY`
**Solution:** 
1. Verify key is copied correctly from Supabase Dashboard
2. Ensure key starts with `eyJhbGc...`
3. Restart development server after updating .env

### Issue: "Network Error" or "Failed to fetch"
**Cause:** Wrong or missing `VITE_SUPABASE_URL`
**Solution:**
1. Verify URL format: `https://[project-id].supabase.co`
2. Ensure no trailing slash
3. Restart development server after updating .env

### Issue: CORS errors
**Cause:** Backend `CORS_ORIGIN` doesn't include frontend URL
**Solution:** Add frontend origin to `backend/.env`:
```env
CORS_ORIGIN=http://localhost:5174,http://localhost:5173
```

---

## Need More Help?

- **Full Documentation:** [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
- **Payment Setup:** [PAYMENT_CONFIGURATION_GUIDE.md](./PAYMENT_CONFIGURATION_GUIDE.md)
- **Backend Config:** [backend/CONFIGURATION.md](./backend/CONFIGURATION.md)
- **Supabase Docs:** https://supabase.com/docs
- **Troubleshooting:** Check browser console and backend logs for specific errors

---

**Last Updated:** October 26, 2025
