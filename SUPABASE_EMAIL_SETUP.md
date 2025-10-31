# Supabase Email Verification Setup

## Issue: Email Not Working After Sign Up

When you sign up with an email, Supabase requires email verification by default. This is why `karrarmayaly@gmail.com` doesn't redirect after sign-up, but needs to verify the email first.

## Solution Options

### Option 1: Disable Email Confirmation (Recommended for Development)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Providers** → **Email**
4. Scroll down to **"Confirm email"**
5. **Uncheck** "Enable email confirmations"
6. Click **Save**

Now when you sign up, you'll be automatically logged in without needing to verify your email.

### Option 2: Verify Email Manually

1. Sign up with your email
2. Check your email inbox (including spam folder)
3. Click the verification link in the email from Supabase
4. You'll be redirected back to the app
5. Now you can sign in

### Option 3: Manually Confirm User in Supabase Dashboard

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Find the user with email `karrarmayaly@gmail.com`
3. Click on the user
4. Look for "Email Confirmed" status
5. If not confirmed, you can manually confirm it in the dashboard

## Current Behavior

- **Sign Up**: Creates account → Sends verification email → Shows message "Please check your email"
- **Sign In**: Only works after email is verified
- **Admin Email** (`karrarmayaly@gmail.com`): Will redirect to `/admin` after verification
- **Regular Users**: Will redirect to `/dashboard` after verification

## Testing

After disabling email confirmation:
1. Try signing up with `karrarmayaly@gmail.com`
2. You should be automatically logged in
3. You should be redirected to `/admin` page
4. You should have access to `/dentist-dashboard`

## Production Recommendation

For production, **keep email confirmation enabled** for security. Only disable it during development for easier testing.
