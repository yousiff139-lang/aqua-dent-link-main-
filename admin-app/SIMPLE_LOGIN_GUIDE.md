# Simple Email-Only Login

## How It Works Now

**Super simple:** Just enter your admin email. No password needed!

## Steps to Access Admin Portal

1. **Start the admin portal:**
   ```bash
   cd admin-app
   npm run dev
   ```

2. **Open:** http://localhost:3010

3. **Enter your email:**
   - karrarmayaly@gmail.com
   - OR bingo@gmail.com

4. **Click "Access Portal"**

5. **Done!** ✅ You're in!

## How It Works

- If your email matches the admin list → Access granted
- If your email doesn't match → Access denied
- No password required
- Session saved in browser (stays logged in)

## Sign Out

Click the "Sign Out" button in the dashboard to log out.

## Security Note

This is a simple authentication for development. For production, you should:
- Add proper authentication
- Use secure tokens
- Implement rate limiting
- Add HTTPS

But for now, it's simple and works!

## Authorized Emails

Only these emails can access (configured in `src/lib/auth.ts`):
- karrarmayaly@gmail.com
- bingo@gmail.com

## Adding More Emails

Edit `admin-app/src/lib/auth.ts`:

```typescript
export const ADMIN_EMAILS: string[] = [
  "karrarmayaly@gmail.com",
  "bingo@gmail.com",
  "newemail@example.com", // Add here
];
```

---

**That's it! No more password headaches!** 🎉
