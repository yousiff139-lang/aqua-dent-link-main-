# Frontend Verification Guide

## 🎨 Frontend System Check

### 1. Environment Variables

Verify `.env` file in root directory:

```env
VITE_SUPABASE_PROJECT_ID="ypbklvrerxikktkbswad"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwYmtsdnJlcnhpa2t0a2Jzd2FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMDYwMTUsImV4cCI6MjA3NTY4MjAxNX0.e8Gt-zzSlsWN208RJ-FUMLn-L9lkWNFsVEkqCfNGJJ8"
VITE_SUPABASE_URL="https://ypbklvrerxikktkbswad.supabase.co"
VITE_OPENAI_API_KEY="sk-proj-test-key-replace-with-real-key"
GEMINI_API_KEY=AIzaSyA_QzqnZnnjyOcn4JU3o_NWdAA4XukrqVQ
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key_here"
VITE_API_URL="http://localhost:3000"
```

### 2. Start Frontend Applications

#### Main User Website (Port 5174)
```bash
npm install
npm run dev
```

Expected: `Local: http://localhost:5174/`

#### Admin Dashboard (Port 5173)
```bash
cd admin-app
npm install
npm run dev
```

Expected: `Local: http://localhost:5173/`

#### Dentist Portal (Port 5175)
```bash
cd dentist-portal
npm install
npm run dev
```

Expected: `Local: http://localhost:5175/`

### 3. Test User Booking Flow

#### Step 1: Browse Dentists
1. Navigate to: http://localhost:5174/dentists
2. Verify dentists load from database
3. Check images, ratings, specializations display

#### Step 2: View Dentist Profile
1. Click "View Profile" on any dentist
2. Verify profile loads with:
   - Name, specialization, bio
   - Education and expertise
   - Availability schedule
   - Booking form

#### Step 3: Book Appointment
1. Scroll to booking form
2. Fill out all fields:
   - Full Name
   - Email
   - Phone Number
   - Reason for Visit
   - Date (future date)
   - Time (available slot)
   - Payment Method (Cash or Stripe)
3. Click "Book Appointment"
4. Verify confirmation displays

#### Step 4: Check Dashboard
1. Navigate to: http://localhost:5174/dashboard
2. Verify appointment appears in "Upcoming" tab
3. Check appointment details are correct

### 4. Test Admin Dashboard

#### Step 1: Admin Login
1. Navigate to: http://localhost:5174/auth
2. Sign in with: `karrarmayaly@gmail.com`
3. Verify redirect to `/admin`

#### Step 2: View Dentists
1. Verify dentist list loads
2. Click on a dentist
3. Check dentist details display:
   - Profile information
   - Availability schedule
   - Patient appointments

#### Step 3: Manage Availability
1. Go to "Availability" tab
2. Add new time slot
3. Verify slot appears
4. Delete a slot
5. Verify slot removed

### 5. Test Dentist Portal

#### Step 1: Dentist Login
1. Navigate to: http://localhost:5175/auth
2. Sign in with dentist account
3. Verify redirect to `/dentist-portal`

#### Step 2: View Appointments
1. Check appointments list loads
2. Verify patient information displays
3. Click "View Details" on appointment
4. Check all details are visible

#### Step 3: Manage Appointments
1. Mark appointment as "Completed"
2. Verify status updates
3. Add private notes
4. Verify notes save

### 6. Test AI Chatbot Booking

#### Step 1: Open Chatbot
1. Navigate to dentist profile
2. Click "Book with AI Assistant"
3. Verify chatbot modal opens

#### Step 2: Complete Conversation
1. Provide phone number
2. Describe symptoms
3. Upload documents (optional)
4. Select time slot
5. Confirm booking

#### Step 3: Verify Booking
1. Check confirmation message
2. Navigate to dashboard
3. Verify appointment appears

### 7. Test Payment Flow (Stripe)

#### Step 1: Book with Stripe
1. Fill booking form
2. Select "Credit/Debit Card"
3. Click "Continue to Payment"
4. Verify redirect to Stripe Checkout

#### Step 2: Complete Payment
1. Use test card: `4242 4242 4242 4242`
2. Expiry: Any future date
3. CVC: Any 3 digits
4. Complete payment

#### Step 3: Verify Payment
1. Verify redirect back to site
2. Check payment status is "Paid"
3. Verify appointment in dashboard

### 8. Test Cancellation Flow

#### Step 1: Cancel Appointment
1. Go to dashboard
2. Find upcoming appointment
3. Click "Cancel Appointment"
4. Provide cancellation reason
5. Confirm cancellation

#### Step 2: Verify Cancellation
1. Check appointment moves to "History" tab
2. Verify status is "Cancelled"
3. Check cancellation reason displays

### 9. Browser Console Checks

Open browser DevTools (F12) and check for:

#### No Errors
- ❌ No red errors in console
- ⚠️ Warnings are okay (React dev warnings)

#### Successful API Calls
- ✅ Supabase queries succeed
- ✅ Appointments fetch successfully
- ✅ Dentists load correctly

#### Network Tab
- ✅ All API calls return 200/201
- ❌ No 404 or 500 errors
- ✅ Supabase auth working

### 10. Common Issues & Solutions

#### Issue: "Failed to load dentists"
**Solutions:**
1. Check migration is applied
2. Verify Supabase credentials in `.env`
3. Check browser console for errors
4. Verify RLS policies allow public read

#### Issue: "Failed to create appointment"
**Solutions:**
1. Check migration is applied
2. Verify `appointments` table exists
3. Check RLS policy allows public insert
4. Verify all required fields filled

#### Issue: "Authentication required"
**Solutions:**
1. Sign in to application
2. Check JWT token in localStorage
3. Verify Supabase auth session
4. Clear browser cache and retry

#### Issue: "Stripe redirect not working"
**Solutions:**
1. Check `VITE_STRIPE_PUBLISHABLE_KEY` in `.env`
2. Verify backend has `STRIPE_SECRET_KEY`
3. Check backend is running on port 3000
4. Verify `VITE_API_URL` points to backend

#### Issue: "Chatbot not opening"
**Solutions:**
1. Check browser console for errors
2. Verify user is authenticated
3. Check Gemini API key is valid
4. Verify edge function is deployed

### 11. Performance Checks

#### Page Load Times
- Home page: < 2 seconds
- Dentist list: < 3 seconds
- Dentist profile: < 2 seconds
- Dashboard: < 3 seconds

#### API Response Times
- Fetch dentists: < 500ms
- Fetch appointments: < 500ms
- Create appointment: < 1 second
- Update appointment: < 500ms

#### Optimization Tips
- Images lazy loaded
- React Query caching enabled
- Database indexes created
- Supabase connection pooled

### 12. Mobile Responsiveness

Test on different screen sizes:
- ✅ Desktop (1920x1080)
- ✅ Tablet (768x1024)
- ✅ Mobile (375x667)

Check:
- Navigation menu works
- Forms are usable
- Buttons are tappable
- Text is readable
- Images scale properly

### 13. Accessibility Checks

- ✅ Keyboard navigation works
- ✅ Screen reader compatible
- ✅ Color contrast sufficient
- ✅ Form labels present
- ✅ Error messages clear

### 14. Production Readiness

Before deploying:

- [ ] All tests passing
- [ ] No console errors
- [ ] Environment variables set
- [ ] Stripe keys configured
- [ ] API endpoints working
- [ ] Database migration applied
- [ ] RLS policies tested
- [ ] Error handling implemented
- [ ] Loading states present
- [ ] Success messages clear
- [ ] Mobile responsive
- [ ] Accessibility compliant
- [ ] Performance optimized
- [ ] Security reviewed

### 15. Deployment Checklist

#### Frontend Deployment
- [ ] Build production bundle: `npm run build`
- [ ] Test production build locally
- [ ] Update environment variables for production
- [ ] Deploy to hosting (Vercel, Netlify, etc.)
- [ ] Configure custom domain
- [ ] Set up SSL certificate
- [ ] Test deployed application

#### Backend Deployment
- [ ] Set `NODE_ENV=production`
- [ ] Update CORS origins
- [ ] Deploy to hosting (Railway, Render, etc.)
- [ ] Configure environment variables
- [ ] Set up monitoring
- [ ] Test API endpoints
- [ ] Configure webhooks

#### Database
- [ ] Apply all migrations
- [ ] Test RLS policies
- [ ] Set up backups
- [ ] Configure connection pooling
- [ ] Monitor query performance

### 16. Post-Deployment Verification

After deployment:

1. ✅ Test booking flow end-to-end
2. ✅ Verify payments work
3. ✅ Check email notifications
4. ✅ Test admin dashboard
5. ✅ Test dentist portal
6. ✅ Monitor error logs
7. ✅ Check performance metrics
8. ✅ Verify SSL certificate
9. ✅ Test on multiple devices
10. ✅ Get user feedback

### 17. Monitoring & Maintenance

Set up monitoring for:
- Error tracking (Sentry, LogRocket)
- Performance monitoring (Vercel Analytics)
- Uptime monitoring (UptimeRobot)
- Database performance (Supabase Dashboard)
- API response times
- User analytics (Google Analytics)

### 18. Support & Documentation

Provide users with:
- User guide for booking
- FAQ section
- Contact support email
- Video tutorials
- Troubleshooting guide
- Privacy policy
- Terms of service
