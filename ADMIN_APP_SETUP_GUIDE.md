# 🎉 Separate Admin Application Setup Guide

## What Was Created

I've created a **completely separate admin application** that runs on port 3010! This is a standalone React app where admin users (dentists) can create and manage their profiles.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  Main User Website (Port 8000 or default)                   │
│  - Patients browse dentists                                  │
│  - Book appointments                                          │
│  - View dentist profiles                                      │
│                                                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Shared Supabase Database
                     │
┌────────────────────┴────────────────────────────────────────┐
│                                                               │
│  Admin Portal (Port 3010)                                    │
│  - Dentists sign in                                          │
│  - Create/edit their profiles                                │
│  - Manage availability                                        │
│  - View appointments                                          │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Features

### ✅ What Works

1. **Separate Application**
   - Runs on port 3010 (completely independent)
   - Own authentication flow
   - Own UI and navigation

2. **Admin-Only Access**
   - Only karrarmayaly@gmail.com and bingo@gmail.com can access
   - Non-admin emails are rejected at login

3. **Profile Creation Flow**
   - Sign in → Prompted to create profile
   - Fill in specialization, experience, education, bio
   - Profile automatically appears in main website's dentist directory

4. **Dashboard**
   - View appointment statistics
   - See profile information
   - Edit profile anytime

5. **Database Sync**
   - Profiles created in admin app appear in main website
   - Uses same Supabase backend
   - Real-time synchronization

## Setup Instructions

### Step 1: Install Dependencies

```bash
cd admin-app
npm install
```

This will install all required packages for the admin portal.

### Step 2: Start the Admin Portal

```bash
npm run dev
```

The admin portal will start on **http://localhost:3010**

### Step 3: Start the Main Website (in another terminal)

```bash
# Go back to main project
cd ..
npm run dev
```

The main website will start on the default port (usually 5173 or 8000).

### Step 4: Sign In to Admin Portal

1. Open **http://localhost:3010** in your browser
2. Sign up or sign in with:
   - karrarmayaly@gmail.com
   - OR bingo@gmail.com
3. Verify your email if required (check inbox)

### Step 5: Create Your Dentist Profile

1. After signing in, you'll see a prompt to create your profile
2. Click "Create Profile"
3. Fill in your information:
   - **Specialization** (required) - e.g., "General Dentistry"
   - **Years of Experience** - e.g., "10"
   - **Education** - e.g., "DDS from Harvard School of Dental Medicine"
   - **Bio** - Tell patients about yourself
4. Click "Create Profile"

### Step 6: Verify Profile Appears on Main Website

1. Go to the main website (http://localhost:5173 or your port)
2. Navigate to the "Dentists" page
3. Your profile should appear in the dentist directory!

## File Structure

```
admin-app/
├── src/
│   ├── components/
│   │   ├── ui/                    # UI components
│   │   ├── ProtectedRoute.tsx     # Route protection
│   │   └── Toaster.tsx            # Toast notifications
│   ├── contexts/
│   │   └── AuthContext.tsx        # Auth state management
│   ├── lib/
│   │   ├── supabase.ts            # Supabase client
│   │   ├── auth.ts                # Admin email config
│   │   └── utils.ts               # Utilities
│   ├── pages/
│   │   ├── Login.tsx              # Login/signup page
│   │   ├── Dashboard.tsx          # Main dashboard
│   │   └── CreateProfile.tsx      # Profile creation
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env                           # Supabase credentials
├── package.json
├── vite.config.ts                 # Vite config (port 3010)
└── README.md
```

## How It Works

### 1. Authentication Flow

```
Admin Email → Sign Up/Sign In → Email Verification → Dashboard
```

- Only admin emails (karrarmayaly@gmail.com, bingo@gmail.com) can access
- Uses Supabase Auth
- Shares same auth system as main website

### 2. Profile Creation Flow

```
Dashboard → No Profile? → Create Profile Form → Save to Database → Profile Appears on Main Website
```

- Checks if dentist profile exists
- If not, shows "Create Profile" prompt
- Saves to `dentists` table in Supabase
- Main website queries same table

### 3. Database Tables

**dentists table:**
- Stores dentist profiles
- Linked to auth.users by ID
- Contains: specialization, bio, experience, education, rating

**profiles table:**
- Basic user information
- Full name, email
- Created automatically on signup

**user_roles table:**
- Assigns 'dentist' role
- Used for permissions

## Adding More Admin Emails

To authorize more emails:

1. Open `admin-app/src/lib/auth.ts`
2. Add email to array:
   ```typescript
   export const ADMIN_EMAILS: string[] = [
     "karrarmayaly@gmail.com",
     "bingo@gmail.com",
     "newemail@example.com", // Add here
   ];
   ```
3. Restart the admin portal

## Running Both Apps Simultaneously

### Terminal 1 - Main Website
```bash
npm run dev
```
Runs on default port (5173 or 8000)

### Terminal 2 - Admin Portal
```bash
cd admin-app
npm run dev
```
Runs on port 3010

Both apps share the same Supabase database, so changes in one are reflected in the other!

## Troubleshooting

### Issue: "Access Denied" when signing in

**Solution**: 
- Verify you're using karrarmayaly@gmail.com or bingo@gmail.com
- Check spelling of email
- Make sure email is added to ADMIN_EMAILS array

### Issue: Profile not appearing on main website

**Solution**:
- Refresh the main website
- Check that profile was created successfully (view dashboard)
- Verify main website is querying the `dentists` table
- Check browser console for errors

### Issue: Port 3010 already in use

**Solution**:
- Change port in `admin-app/vite.config.ts`:
  ```typescript
  server: {
    port: 3011, // Use different port
  }
  ```

### Issue: Can't install dependencies

**Solution**:
```bash
cd admin-app
rm -rf node_modules package-lock.json
npm install
```

### Issue: Email verification not working

**Solution**:
- Check Supabase email settings
- Disable email confirmation for development:
  1. Go to Supabase Dashboard
  2. Authentication → Providers → Email
  3. Uncheck "Enable email confirmations"

## Production Deployment

### Build Admin Portal

```bash
cd admin-app
npm run build
```

### Deploy Options

1. **Separate Domain**: admin.yourdomain.com
2. **Subdirectory**: yourdomain.com/admin
3. **Different Server**: Completely separate hosting

### Environment Variables for Production

Update `admin-app/.env` with production Supabase credentials:

```env
VITE_SUPABASE_URL=your-production-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-production-key
```

## Benefits of This Architecture

✅ **Separation of Concerns**
- Admin features don't clutter main website
- Different UI/UX for admins vs patients
- Independent deployment and scaling

✅ **Security**
- Admin portal can have stricter security
- Separate authentication flow
- Easy to add admin-specific features

✅ **Flexibility**
- Can run on different servers
- Different update schedules
- Independent testing

✅ **Scalability**
- Admin portal can scale independently
- Main website performance not affected by admin operations

## Next Steps

### Optional Enhancements

1. **Availability Management**
   - Add page to set available appointment times
   - Weekly schedule editor
   - Time slot management

2. **Appointment Management**
   - View all appointments
   - Update appointment status
   - Add notes to appointments

3. **Analytics**
   - Appointment statistics
   - Patient demographics
   - Revenue tracking

4. **Notifications**
   - Email alerts for new bookings
   - SMS notifications
   - In-app notifications

## Testing Checklist

- [ ] Sign up with karrarmayaly@gmail.com
- [ ] Sign up with bingo@gmail.com
- [ ] Try signing in with non-admin email (should be rejected)
- [ ] Create dentist profile
- [ ] View profile on dashboard
- [ ] Edit profile
- [ ] Check profile appears on main website
- [ ] Sign out and sign back in
- [ ] Test on different browsers

## Support

If you encounter issues:

1. **Check browser console** (F12) for errors
2. **Verify Supabase connection** in Network tab
3. **Check environment variables** are set correctly
4. **Ensure both apps are running** on correct ports
5. **Clear browser cache** and try again

---

## 🎉 You're All Set!

You now have two separate applications:

1. **Main Website** (default port) - For patients
2. **Admin Portal** (port 3010) - For dentists

Both share the same database, so profiles created in the admin portal automatically appear on the main website!

**Start the admin portal:**
```bash
cd admin-app
npm run dev
```

**Visit:** http://localhost:3010

Sign in with your admin email and create your dentist profile! 🦷
