# Dental Admin Portal

A separate admin application for dentists to manage their profiles. Runs on port 3010.

## Features

- **Secure Admin Access**: Only authorized emails (karrarmayaly@gmail.com, bingo@gmail.com) can access
- **Profile Creation**: Dentists can create and edit their professional profiles
- **Profile Information**:
  - Specialization
  - Years of experience
  - Education background
  - Professional bio
- **Dashboard**: View appointment statistics and profile information
- **Automatic Sync**: Profiles created here appear in the main user website's dentist directory

## Setup

### 1. Install Dependencies

```bash
cd admin-app
npm install
```

### 2. Environment Variables

The `.env` file is already configured with your Supabase credentials (shared with the main app).

### 3. Run the Admin Portal

```bash
npm run dev
```

The admin portal will start on **http://localhost:3010**

## Usage

### For Dentists (Admins)

1. **Sign Up/Sign In**
   - Go to http://localhost:3010
   - Sign up or sign in with your admin email (karrarmayaly@gmail.com or bingo@gmail.com)
   - Verify your email if required

2. **Create Your Profile**
   - After signing in, you'll be prompted to create your dentist profile
   - Fill in your information:
     - Specialization (required)
     - Years of experience
     - Education background
     - Professional bio
   - Click "Create Profile"

3. **View Dashboard**
   - See your appointment statistics
   - View your profile information
   - Edit your profile anytime

4. **Profile Appears on Main Website**
   - Once created, your profile automatically appears in the dentist directory on the main user website (port 8000)
   - Patients can view your information and book appointments with you

## Architecture

### Separate Application Benefits

- **Independent Deployment**: Admin portal can be deployed separately
- **Different Port**: Runs on port 3010, main app on default port
- **Shared Database**: Both apps use the same Supabase backend
- **Role-Based Access**: Only admin emails can access this portal
- **Clean Separation**: Admin features don't clutter the main user-facing app

### How It Works

1. **Authentication**: Uses Supabase Auth with admin email verification
2. **Profile Storage**: Stores dentist profiles in the `dentists` table
3. **Role Assignment**: Automatically assigns 'dentist' role when profile is created
4. **Data Sync**: Main website queries the same `dentists` table to display profiles

## File Structure

```
admin-app/
├── src/
│   ├── components/
│   │   ├── ui/              # UI components (Button, Input, Card, etc.)
│   │   ├── ProtectedRoute.tsx
│   │   └── Toaster.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx  # Authentication state management
│   ├── lib/
│   │   ├── supabase.ts      # Supabase client
│   │   ├── auth.ts          # Admin email configuration
│   │   └── utils.ts         # Utility functions
│   ├── pages/
│   │   ├── Login.tsx        # Login/signup page
│   │   ├── Dashboard.tsx    # Main dashboard
│   │   └── CreateProfile.tsx # Profile creation/editing
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── .env                     # Environment variables
├── package.json
├── vite.config.ts
└── README.md
```

## Database Tables Used

### dentists
- `id` (UUID) - References auth.users
- `specialization` (text) - Required
- `bio` (text) - Optional
- `years_of_experience` (integer) - Optional
- `education` (text) - Optional
- `rating` (decimal) - Default 5.0

### profiles
- `id` (UUID) - References auth.users
- `full_name` (text)
- `email` (text)

### user_roles
- `user_id` (UUID) - References auth.users
- `role` (enum) - 'dentist', 'patient', 'admin'

## Adding More Admin Emails

To add more authorized emails:

1. Open `src/lib/auth.ts`
2. Add the email to the `ADMIN_EMAILS` array:
   ```typescript
   export const ADMIN_EMAILS: string[] = [
     "karrarmayaly@gmail.com",
     "bingo@gmail.com",
     "newemail@example.com", // Add here
   ];
   ```

## Development

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Troubleshooting

### Can't Access Admin Portal

- Verify you're using an authorized email (karrarmayaly@gmail.com or bingo@gmail.com)
- Check that your email is verified in Supabase
- Clear browser cache and try again

### Profile Not Appearing on Main Website

- Ensure the profile was created successfully (check dashboard)
- Verify the main website is querying the `dentists` table correctly
- Check Supabase RLS policies allow reading dentist profiles

### Port Already in Use

If port 3010 is already in use, you can change it in `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    port: 3011, // Change to any available port
  },
})
```

## Support

For issues or questions:
1. Check the browser console for errors (F12)
2. Verify Supabase connection in the Network tab
3. Check that all environment variables are set correctly

---

**Admin Portal is ready!** 🎉

Sign in at http://localhost:3010 with your admin email to get started.
