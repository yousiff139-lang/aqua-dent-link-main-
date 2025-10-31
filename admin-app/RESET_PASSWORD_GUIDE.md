# Reset Password for Admin Accounts

## The Issue

The accounts exist in Supabase but you don't know the passwords or they're incorrect.

## Solution: Reset Passwords in Supabase Dashboard

### Option 1: Reset Password via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Authentication**
   - Click "Authentication" in the left sidebar
   - Click "Users"

3. **Find the User**
   - Look for karrarmayaly@gmail.com or bingo@gmail.com in the list

4. **Reset Password**
   - Click on the user row
   - Click the "..." menu (three dots)
   - Select "Reset Password"
   - Choose one of:
     - **Send password reset email** (user clicks link and sets new password)
     - **Set new password manually** (you set it directly)

5. **Set New Password**
   - If setting manually, enter a new password (at least 8 characters)
   - Click "Update User"

6. **Try Signing In**
   - Go to http://localhost:3010
   - Use the email and new password
   - Should work now!

### Option 2: Delete and Recreate Account

If reset doesn't work:

1. **Delete Existing User**
   - Go to Supabase Dashboard → Authentication → Users
   - Find the user (karrarmayaly@gmail.com or bingo@gmail.com)
   - Click "..." menu → "Delete User"
   - Confirm deletion

2. **Create New Account via SQL**
   - Go to SQL Editor in Supabase
   - Run this SQL (replace with your email and password):

```sql
-- For karrarmayaly@gmail.com
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'karrarmayaly@gmail.com',
  crypt('YOUR_PASSWORD_HERE', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  ''
);
```

Replace `YOUR_PASSWORD_HERE` with your desired password.

### Option 3: Use Supabase CLI to Reset Password

If you have Supabase CLI installed:

```bash
supabase db reset
```

Then recreate the accounts with known passwords.

## After Resetting Password

1. **Go to admin portal**: http://localhost:3010
2. **Enter email**: karrarmayaly@gmail.com (or bingo@gmail.com)
3. **Enter new password**: The password you just set
4. **Click "Sign In"**
5. **Should work!** ✅

## Provide Me the Passwords

Once you've reset the passwords, you can tell me:

**For karrarmayaly@gmail.com:**
- Password: [tell me the password]

**For bingo@gmail.com:**
- Password: [tell me the password]

I can then test the login to make sure it works!

## Security Note

- Passwords are hashed in Supabase (secure)
- Never share passwords in public repositories
- Use strong passwords (at least 8 characters, mix of letters, numbers, symbols)
- The admin portal no longer displays authorized emails (security fix applied)

---

**Quick Steps:**
1. Go to Supabase Dashboard
2. Authentication → Users
3. Find user → Reset Password
4. Set new password
5. Try signing in at http://localhost:3010
