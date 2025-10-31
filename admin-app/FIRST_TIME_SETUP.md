# First Time Setup - Admin Portal

## ⚠️ Important: You Need to Sign Up First!

If you're seeing "Invalid Login Credentials", it means you need to **create your account first**.

## Step-by-Step Instructions

### 1. Start the Admin Portal

```bash
cd admin-app
npm install
npm run dev
```

Open http://localhost:3010

### 2. Create Your Account (Sign Up)

1. **Click "Don't have an account? Sign up"** at the bottom of the form
2. **Enter your admin email:**
   - karrarmayaly@gmail.com
   - OR bingo@gmail.com
3. **Create a password** (at least 8 characters)
4. **Click "Sign Up"**

### 3. Verify Your Email (If Required)

Depending on your Supabase settings, you may need to verify your email:

**Option A: Email Confirmation Enabled**
- Check your email inbox (and spam folder)
- Click the verification link
- Come back to http://localhost:3010
- Click "Already have an account? Sign in"
- Enter your email and password
- Click "Sign In"

**Option B: Email Confirmation Disabled**
- You'll be automatically signed in
- Redirected to dashboard

### 4. Create Your Dentist Profile

After signing in:
1. You'll see a prompt to create your profile
2. Click "Create Profile"
3. Fill in your information:
   - Specialization (required)
   - Years of experience
   - Education
   - Bio
4. Click "Create Profile"
5. Your profile now appears on the main website!

## Troubleshooting

### "Invalid Login Credentials" Error

**Problem:** You're trying to sign in but the account doesn't exist yet.

**Solution:** 
1. Click "Don't have an account? Sign up"
2. Create your account first
3. Then sign in

### "Access Denied" Error

**Problem:** You're using an email that's not authorized.

**Solution:** 
- Only these emails can access:
  - karrarmayaly@gmail.com
  - bingo@gmail.com
- Make sure you're using exactly one of these emails

### Email Verification Taking Too Long

**Problem:** You signed up but didn't receive the verification email.

**Solution - Disable Email Confirmation (Development Only):**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **Providers** → **Email**
4. Scroll to **"Confirm email"** section
5. **Uncheck** "Enable email confirmations"
6. Click **Save**
7. Delete your existing account from Authentication → Users
8. Sign up again - you'll be auto-logged in!

### Can't Access Admin Portal

**Checklist:**
- [ ] Using admin email (karrarmayaly@gmail.com or bingo@gmail.com)
- [ ] Created account by signing up first
- [ ] Verified email (if confirmation is enabled)
- [ ] Using correct password
- [ ] Admin portal is running on port 3010

## Quick Commands

### Install Dependencies
```bash
cd admin-app
npm install
```

### Start Admin Portal
```bash
cd admin-app
npm run dev
```

### Check if Running
Open http://localhost:3010 in your browser

## What Happens After Sign Up?

```
Sign Up → Email Verification (maybe) → Sign In → Dashboard → Create Profile → Done!
```

Your profile will immediately appear on the main website's dentist directory!

## Need Help?

1. **Check browser console** (F12) for errors
2. **Check Supabase logs** in the dashboard
3. **Verify environment variables** in `admin-app/.env`
4. **Make sure Supabase is accessible**

---

## Quick Start (First Time)

```bash
# 1. Install and start
cd admin-app
npm install
npm run dev

# 2. Open browser
# http://localhost:3010

# 3. Click "Sign up" (not "Sign in"!)

# 4. Use admin email:
# karrarmayaly@gmail.com or bingo@gmail.com

# 5. Create password and sign up

# 6. Verify email if needed

# 7. Sign in

# 8. Create your dentist profile

# Done! ✅
```

---

**Remember:** You must **sign up** before you can **sign in**!
