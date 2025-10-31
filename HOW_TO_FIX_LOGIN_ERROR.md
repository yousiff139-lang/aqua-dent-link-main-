# How to Fix "Invalid Login Credentials" Error

## The Problem

You're seeing this error because **you're trying to sign in to an account that doesn't exist yet**.

## The Solution

You need to **SIGN UP first**, not sign in!

## Step-by-Step Fix

### 1. Go to the Admin Portal

Open http://localhost:3010

### 2. Click "Sign Up" Instead of "Sign In"

Look at the bottom of the form and click:
**"Don't have an account? Sign up"**

### 3. Enter Your Admin Email

Use one of these authorized emails:
- karrarmayaly@gmail.com
- bingo@gmail.com

### 4. Create a Password

Enter a password (at least 8 characters)

### 5. Click "Sign Up"

The button should say "Sign Up" not "Sign In"

### 6. Handle Email Verification

**If you see "Verify Your Email":**
- Check your email inbox (and spam folder)
- Click the verification link
- Come back and sign in

**If you're automatically signed in:**
- Great! You're done with this step

### 7. Create Your Profile

After signing in, you'll see a dashboard prompting you to create your dentist profile.

## Visual Guide

```
❌ WRONG:
Go to http://localhost:3010
↓
Try to "Sign In" with email
↓
Get "Invalid Login Credentials" error
(Account doesn't exist!)

✅ CORRECT:
Go to http://localhost:3010
↓
Click "Don't have an account? Sign up"
↓
Enter admin email and password
↓
Click "Sign Up"
↓
Verify email (if needed)
↓
Sign in
↓
Create profile
↓
Success! ✅
```

## Updated Login Page

I've updated the login page to:
- ✅ Show a helpful message if you try to sign in without an account
- ✅ Automatically switch to sign up mode if account doesn't exist
- ✅ Display clear instructions for first-time users
- ✅ Show which emails are authorized

## Quick Test

1. **Start the admin portal:**
   ```bash
   cd admin-app
   npm run dev
   ```

2. **Open:** http://localhost:3010

3. **You should see:**
   - A blue info box saying "First time here? Click 'Sign up'"
   - A form with email and password fields
   - A button at the bottom: "Don't have an account? Sign up"

4. **Click that button** to switch to sign up mode

5. **Enter your email** (karrarmayaly@gmail.com or bingo@gmail.com)

6. **Create a password** and click "Sign Up"

## Still Having Issues?

### Issue: "Access Denied"

**Cause:** You're using an email that's not authorized.

**Fix:** Only use karrarmayaly@gmail.com or bingo@gmail.com

### Issue: Email verification not working

**Fix:** Disable email confirmation in Supabase:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Authentication → Providers → Email
3. Uncheck "Enable email confirmations"
4. Save
5. Delete existing user and sign up again

### Issue: Can't see the admin portal

**Fix:** Make sure it's running:
```bash
cd admin-app
npm run dev
```

Check that you see: "Local: http://localhost:3010"

## Summary

**The key point:** You must **SIGN UP** before you can **SIGN IN**!

1. Go to http://localhost:3010
2. Click "Don't have an account? Sign up"
3. Use karrarmayaly@gmail.com or bingo@gmail.com
4. Create a password
5. Sign up
6. Verify email if needed
7. Sign in
8. Create your dentist profile

---

**After you sign up once, you can sign in normally with your email and password!**
