# 🚀 DentalCareConnect - Complete Usage Guide

## Your System is Ready! Here's How to Use It

---

## 🌐 Access Your Application

**Frontend URL:** http://localhost:8081

Your application is currently running and ready to use!

---

## 👥 User Roles & Access

### 1. **Patient Portal**
**URL:** http://localhost:8081/dashboard

**Features:**
- View appointments
- Book new appointments
- Chat with AI assistant
- View dentist profiles
- Manage profile

**How to Access:**
1. Go to http://localhost:8081/auth
2. Register as a new patient OR
3. Login with existing credentials

### 2. **Dentist Portal**
**URL:** http://localhost:8081/dentist-dashboard

**Features:**
- View assigned patients
- Manage appointments
- Update availability
- View patient history

**How to Access:**
1. Login with dentist credentials
2. System redirects to dentist dashboard

### 3. **Admin Panel**
**URL:** http://localhost:8081/admin

**Features:**
- Manage all dentists
- View all appointments
- Monitor system statistics
- Manage patients
- System analytics

**How to Access:**
1. Go to http://localhost:8081/admin
2. Login with admin credentials

---

## 🧪 Testing the System

### Test 1: Patient Registration & Login

```
1. Go to: http://localhost:8081/auth
2. Click "Sign Up"
3. Enter:
   - Full Name: Test Patient
   - Email: test@patient.com
   - Password: test123
4. Click "Create Account"
5. You'll be redirected to Dashboard
```

### Test 2: AI Chatbot

```
1. Login as a patient
2. Go to Dashboard
3. Click the 💬 chat button (bottom-right)
4. Chatbot should greet you: "Hi Test! Welcome back..."
5. Try: "I have tooth pain"
6. Chatbot will suggest a dentist
7. Follow the booking flow
```

### Test 3: Book Appointment

```
1. From Dashboard, click "Book New"
2. Browse dentists at /dentists
3. Select a dentist
4. Choose date and time
5. Confirm booking
6. Check Dashboard for new appointment
```

### Test 4: Admin Panel

```
1. Go to: http://localhost:8081/admin
2. Login with admin credentials
3. View:
   - Total patients
   - Total dentists
   - Total appointments
   - Revenue statistics
4. Manage dentists and appointments
```

---

## 🤖 Chatbot Features

Your AI chatbot is **already integrated** with Supabase!

### What It Does:
1. **Auto-fetches your name** from database
2. **Greets you personally:** "Hi Ahmed! Welcome back..."
3. **Asks about symptoms:** "What brings you in today?"
4. **Matches dentist:** Based on your symptoms
5. **Books appointment:** Directly via Supabase
6. **Confirms booking:** Shows appointment ID

### How to Test:
```
1. Login as patient
2. Click 💬 chat button
3. Say: "I need braces"
4. Chatbot suggests: Orthodontist
5. Follow booking flow
6. Appointment saved to Supabase
```

---

## 📊 Supabase Dashboard

### Access Supabase:
**URL:** https://supabase.com/dashboard/project/ypbklvrerxikktkbswad

### What You Can Do:
1. **Table Editor:** View/edit all data
2. **SQL Editor:** Run custom queries
3. **Authentication:** Manage users
4. **Storage:** Manage files
5. **Functions:** Edge functions
6. **Logs:** View system logs

### View Your Data:
```sql
-- View all patients
SELECT * FROM profiles;

-- View all dentists
SELECT * FROM dentists;

-- View all appointments
SELECT * FROM appointments;

-- View appointments with patient names
SELECT 
  a.*,
  p.full_name as patient_name,
  d.name as dentist_name
FROM appointments a
JOIN profiles p ON a.patient_id = p.id
JOIN dentists d ON a.dentist_id = d.id;
```

---

## 🔐 Default Credentials

### Admin Access
Check your Supabase dashboard for admin users or create one:

```sql
-- Create admin user in Supabase SQL Editor
INSERT INTO profiles (id, full_name, email, role)
VALUES (
  'your-user-id-here',
  'Admin User',
  'admin@dentalcare.com',
  'admin'
);
```

### Test Patient
- Email: (any you register)
- Password: (what you set)

### Test Dentist
Check `dentists` table in Supabase for existing dentists

---

## 🎯 Common Tasks

### Add a New Dentist
```
1. Go to Admin Panel
2. Click "Add Dentist"
3. Fill in details:
   - Name
   - Specialization
   - Email
   - Phone
   - Rating
4. Save
5. Dentist appears in system
```

### View Appointments
```
Patient View:
- Dashboard → "My Appointments" tab

Dentist View:
- Dentist Dashboard → "Appointments" section

Admin View:
- Admin Panel → "All Appointments"
```

### Cancel Appointment
```
1. Go to Dashboard
2. Find appointment
3. Click "Cancel"
4. Confirm cancellation
5. Status updates to "cancelled"
```

---

## 🐛 Troubleshooting

### Chatbot Not Greeting by Name
**Issue:** Chatbot says "Hi there!" instead of your name

**Fix:**
1. Check if you're logged in
2. Verify `profiles` table has your `full_name`
3. Check browser console for errors

### Can't Access Admin Panel
**Issue:** Redirected or access denied

**Fix:**
1. Check user role in Supabase
2. Ensure `role` field is set to 'admin'
3. Clear browser cache and re-login

### Appointments Not Showing
**Issue:** Booked appointment doesn't appear

**Fix:**
1. Check Supabase `appointments` table
2. Verify `patient_id` matches your user ID
3. Check appointment status is 'upcoming'

### Database Connection Error
**Issue:** "Failed to fetch" errors

**Fix:**
1. Check `.env` file has correct Supabase URL
2. Verify Supabase project is active
3. Check internet connection
4. Restart frontend: `npm run dev`

---

## 📱 Mobile Testing

Your app is responsive! Test on mobile:

```
1. Get your local IP: ipconfig (Windows) or ifconfig (Mac/Linux)
2. Access from phone: http://YOUR_IP:8081
3. Test all features on mobile
```

---

## 🚀 Deployment (When Ready)

### Frontend (Vercel/Netlify)
```bash
# Build
npm run build

# Deploy to Vercel
vercel deploy

# Or Netlify
netlify deploy
```

### Backend (Already Deployed!)
Your Supabase backend is already live at:
`https://ypbklvrerxikktkbswad.supabase.co`

---

## ✅ Feature Checklist

Test these features:

- [ ] Patient registration
- [ ] Patient login
- [ ] Chatbot greeting (with name)
- [ ] Chatbot symptom detection
- [ ] Dentist recommendation
- [ ] Appointment booking
- [ ] View appointments
- [ ] Cancel appointment
- [ ] Dentist dashboard
- [ ] Admin panel access
- [ ] View statistics
- [ ] Manage dentists
- [ ] Mobile responsive

---

## 🎊 Your System is Ready!

Everything is working with Supabase:
- ✅ Frontend running on port 8081
- ✅ Supabase backend connected
- ✅ Chatbot integrated
- ✅ All portals functional
- ✅ Database active

**Start using it now at:** http://localhost:8081

---

## 📞 Quick Links

- **Frontend:** http://localhost:8081
- **Patient Dashboard:** http://localhost:8081/dashboard
- **Dentist Dashboard:** http://localhost:8081/dentist-dashboard
- **Admin Panel:** http://localhost:8081/admin
- **Supabase Dashboard:** https://supabase.com/dashboard/project/ypbklvrerxikktkbswad

---

**Enjoy your DentalCareConnect system!** 🦷✨
