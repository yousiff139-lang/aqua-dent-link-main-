# Admin Portal Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│                        SUPABASE BACKEND                          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   auth.users │  │   profiles   │  │  user_roles  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   dentists   │  │ appointments │  │  documents   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ Shared Database
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        │                                       │
┌───────▼────────┐                    ┌────────▼────────┐
│                │                    │                 │
│  MAIN WEBSITE  │                    │  ADMIN PORTAL   │
│  (Port 8000)   │                    │  (Port 3010)    │
│                │                    │                 │
│  For Patients: │                    │  For Dentists:  │
│  - Browse      │                    │  - Sign in      │
│  - Book        │                    │  - Create       │
│  - View        │                    │    profile      │
│                │                    │  - Manage       │
└────────────────┘                    └─────────────────┘
```

## Data Flow

### Profile Creation Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Dentist signs in to Admin Portal (port 3010)            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Dashboard checks if dentist profile exists              │
│    Query: SELECT * FROM dentists WHERE id = user.id        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. If no profile: Show "Create Profile" prompt             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Dentist fills in profile form:                          │
│    - Specialization                                         │
│    - Years of experience                                    │
│    - Education                                              │
│    - Bio                                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Save to Supabase:                                        │
│    INSERT INTO dentists (id, specialization, bio, ...)     │
│    INSERT INTO user_roles (user_id, role='dentist')        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Profile immediately available on Main Website           │
│    Query: SELECT * FROM dentists JOIN profiles             │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Admin Portal Components

```
App.tsx
├── AuthProvider (Context)
│   └── Manages authentication state
│
├── Routes
│   ├── /login
│   │   └── Login.tsx
│   │       ├── Email/password form
│   │       ├── Admin email validation
│   │       └── Supabase auth
│   │
│   ├── /dashboard (Protected)
│   │   └── Dashboard.tsx
│   │       ├── Check if profile exists
│   │       ├── Show stats (appointments, rating)
│   │       └── Display profile info
│   │
│   └── /create-profile (Protected)
│       └── CreateProfile.tsx
│           ├── Profile form
│           ├── Validation
│           └── Save to database
│
└── Toaster (Global notifications)
```

## Authentication Flow

```
┌──────────────┐
│ User visits  │
│ port 3010    │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Is user signed in?   │
└──────┬───────────────┘
       │
       ├─ No ──────────────────────┐
       │                            │
       │                            ▼
       │                    ┌───────────────┐
       │                    │ Redirect to   │
       │                    │ /login        │
       │                    └───────┬───────┘
       │                            │
       │                            ▼
       │                    ┌───────────────┐
       │                    │ Enter email   │
       │                    │ and password  │
       │                    └───────┬───────┘
       │                            │
       │                            ▼
       │                    ┌───────────────┐
       │                    │ Is admin      │
       │                    │ email?        │
       │                    └───┬───────────┘
       │                        │
       │                        ├─ No ──────┐
       │                        │            │
       │                        │            ▼
       │                        │    ┌──────────────┐
       │                        │    │ Show error:  │
       │                        │    │ Access Denied│
       │                        │    └──────────────┘
       │                        │
       │                        └─ Yes ─────┐
       │                                    │
       │                                    ▼
       │                            ┌───────────────┐
       │                            │ Sign in with  │
       │                            │ Supabase      │
       │                            └───────┬───────┘
       │                                    │
       └─ Yes ─────────────────────────────┘
                                            │
                                            ▼
                                    ┌───────────────┐
                                    │ Redirect to   │
                                    │ /dashboard    │
                                    └───────────────┘
```

## Database Schema

### Tables Used by Admin Portal

```sql
-- Authentication
auth.users
├── id (UUID)
├── email
└── user_metadata

-- User Profiles
profiles
├── id (UUID) → auth.users.id
├── full_name
└── email

-- Dentist Profiles (Created by Admin Portal)
dentists
├── id (UUID) → profiles.id
├── specialization (TEXT) *required
├── bio (TEXT)
├── years_of_experience (INTEGER)
├── education (TEXT)
├── rating (DECIMAL)
├── created_at
└── updated_at

-- Role Assignment
user_roles
├── user_id (UUID) → auth.users.id
├── role (ENUM: 'dentist', 'patient', 'admin')
└── created_at

-- Appointments (Read-only for stats)
appointments
├── id (UUID)
├── patient_id (UUID)
├── dentist_id (UUID) → dentists.id
├── appointment_date
├── status
└── ...
```

## Security Model

### Row Level Security (RLS)

```sql
-- Dentists can view their own profile
CREATE POLICY "Dentists can view own profile"
  ON dentists FOR SELECT
  USING (auth.uid() = id);

-- Dentists can update their own profile
CREATE POLICY "Dentists can update own profile"
  ON dentists FOR UPDATE
  USING (auth.uid() = id);

-- Dentists can insert their own profile
CREATE POLICY "Dentists can insert own profile"
  ON dentists FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Anyone can view dentist profiles (for main website)
CREATE POLICY "Anyone can view dentists"
  ON dentists FOR SELECT
  TO authenticated
  USING (true);
```

### Client-Side Protection

```typescript
// ProtectedRoute.tsx
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  
  // Check if user is signed in
  if (!user) return <Navigate to="/login" />
  
  // Check if user is admin
  if (!isAdminEmail(user.email)) {
    return <AccessDenied />
  }
  
  return children
}
```

## API Calls

### Profile Creation

```typescript
// 1. Create profile entry
await supabase
  .from('profiles')
  .insert({
    id: user.id,
    email: user.email,
    full_name: user.email.split('@')[0]
  })

// 2. Create dentist profile
await supabase
  .from('dentists')
  .insert({
    id: user.id,
    specialization: formData.specialization,
    bio: formData.bio,
    years_of_experience: formData.years_of_experience,
    education: formData.education,
    rating: 5.0
  })

// 3. Assign dentist role
await supabase
  .from('user_roles')
  .insert({
    user_id: user.id,
    role: 'dentist'
  })
```

### Profile Retrieval

```typescript
// Check if profile exists
const { data } = await supabase
  .from('dentists')
  .select('*')
  .eq('id', user.id)
  .single()

// Get appointment count
const { count } = await supabase
  .from('appointments')
  .select('*', { count: 'exact', head: true })
  .eq('dentist_id', user.id)
```

## State Management

### Auth Context

```typescript
interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

// Provides authentication state to entire app
<AuthProvider>
  <App />
</AuthProvider>
```

### Component State

```typescript
// Dashboard.tsx
const [profile, setProfile] = useState<DentistProfile | null>(null)
const [loading, setLoading] = useState(true)
const [appointmentCount, setAppointmentCount] = useState(0)

// CreateProfile.tsx
const [formData, setFormData] = useState({
  specialization: '',
  bio: '',
  years_of_experience: '',
  education: '',
})
```

## Deployment Architecture

### Development

```
localhost:8000  → Main Website
localhost:3010  → Admin Portal
```

### Production Options

#### Option 1: Separate Subdomains
```
www.yourdomain.com     → Main Website
admin.yourdomain.com   → Admin Portal
```

#### Option 2: Same Domain, Different Paths
```
yourdomain.com/        → Main Website
yourdomain.com/admin/  → Admin Portal
```

#### Option 3: Completely Separate Domains
```
dentalcare.com         → Main Website
dentaladmin.com        → Admin Portal
```

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**
   - Components loaded on demand
   - Reduces initial bundle size

2. **Caching**
   - Profile data cached in state
   - Reduces database queries

3. **Optimistic Updates**
   - UI updates immediately
   - Syncs with database in background

4. **Code Splitting**
   - Separate bundles for each route
   - Faster page loads

## Monitoring & Logging

### Key Metrics to Track

1. **Authentication**
   - Login success/failure rate
   - Email verification rate
   - Session duration

2. **Profile Creation**
   - Completion rate
   - Time to complete
   - Field validation errors

3. **Performance**
   - Page load times
   - API response times
   - Error rates

### Logging Points

```typescript
// Login
console.log('Login attempt:', { email })
console.log('Login success:', { userId })

// Profile Creation
console.log('Profile creation started:', { userId })
console.log('Profile saved:', { profileId })

// Errors
console.error('Profile creation failed:', error)
```

---

This architecture provides a clean separation between the patient-facing website and the dentist admin portal, while maintaining data consistency through a shared Supabase backend.
