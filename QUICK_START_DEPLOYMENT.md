# ⚡ QUICK START - 5 Minute Deployment

## 🎯 Goal
Get your booking system working in 5 minutes.

---

## ✅ Step 1: Apply Migration (2 min)

1. Open: https://supabase.com/dashboard
2. Select project: **ypbklvrerxikktkbswad**
3. SQL Editor → New Query
4. Copy/paste: `supabase/migrations/20251027140000_fix_schema_cache_appointments.sql`
5. Click **Run**
6. Wait for: `🎉 Migration completed successfully!`

---

## ✅ Step 2: Start Backend (1 min)

```bash
cd backend
npm run dev
```

Verify: http://localhost:3000/health

---

## ✅ Step 3: Start Frontend (1 min)

```bash
npm run dev
```

Verify: http://localhost:5173

---

## ✅ Step 4: Test Booking (1 min)

1. Go to: http://localhost:5173/dentists
2. Click any dentist → "View Profile"
3. Fill booking form
4. Submit
5. See confirmation ✅

---

## 🎉 Done!

Your booking system is now working.

**Next:** See `ACTION_PLAN_IMMEDIATE.md` for complete setup.

---

## 🐛 Quick Fixes

**Backend won't start:**
```bash
cd backend && npm install && npm run dev
```

**Frontend errors:**
```bash
npm install && npm run dev
```

**Booking fails:**
- Check backend is running
- Check `.env` has `VITE_API_URL=http://localhost:3000`
- Re-run migration

---

## 📞 Help

- Full guide: `DEPLOY_MIGRATION_NOW.md`
- Verification: `VERIFY_SYSTEM_COMPLETE.md`
- Troubleshooting: `ACTION_PLAN_IMMEDIATE.md`

