# Design Document

## Overview

This design establishes a comprehensive seeding system for creating a default dentist profile (Dr. Michael Chen) with complete demo data. The system ensures the dentist profile is automatically created on initialization, appears in the user-facing Dentists page, provides admin dashboard access, and displays today's appointments in real-time.

## Architecture

### System Components

```
Database Layer (Supabase)
├── Migration: Create Dr. Michael Chen seed data
├── Tables: auth.users, profiles, dentists, user_roles, appointments
└── Functions: Seed default dentist on system init

Application Layer
├── User Website (Port 8000)
│   ├── Dentists Page: Display Dr. Chen's profile
│   └── Dentist Profile Page: Show detailed information
└── Admin Dashboard (Port 3010)
    ├── Login: Authenticate Dr. Chen
    ├── Dashboard: Show today's appointments
    └── Profile Management: Edit dentist information
```

### Data Flow

1. **System Initialization**: Migration creates Dr. Michael Chen's account
2. **User Website**: Fetches dentist profiles from database, displays Dr. Chen
3. **Admin Login**: Authenticates Dr. Chen with credentials
4. **Dashboard Load**: Queries today's appointments filtered by dentist_id
5. **Profile Sync**: Updates propagate from admin to user website via database

## Components and Interfaces

### 1. Database Migration for Default Dentist

**File**: `supabase/migrations/[timestamp]_seed_default_dentist.sql`

**Purpose**: Create Dr. Michael Chen's account with complete profile data

**Schema Operations**:

```sql
-- Create auth user for Dr. Michael Chen
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data
) VALUES (
  'dr.michaelchen@clinic.com',
  crypt('securetest123', gen_salt('bf')),
  now(),
  '{"full_name": "Dr. Michael Chen"}'::jsonb
);

-- Create profile
INSERT INTO public.profiles (
  id,
  full_name,
  email,
  phone
) VALUES (
  [user_id],
  'Dr. Michael Chen',
  'dr.michaelchen@clinic.com',
  '+1 (416) 555-0123'
);

-- Grant dentist role
INSERT INTO public.user_roles (
  user_id,
  role
) VALUES (
  [user_id],
  'dentist'
);

-- Create dentist profile
INSERT INTO public.dentists (
  id,
  specialization,
  bio,
  years_of_experience,
  rating,
  education,
  clinic_address,
  available_times
) VALUES (
  [user_id],
  'General & Cosmetic Dentistry',
  'Friendly and precise dental professional focused on patient comfort and oral health.',
  10,
  5.0,
  'DDS, University of Toronto',
  'Downtown Dental Care, Toronto, Canada',
  '{"monday": "09:00-17:00", "tuesday": "09:00-17:00", ...}'::jsonb
);
```

### 2. Dentists Table Schema Extension

**Current Fields** (from existing migrations):
- `id` (UUID, primary key)
- `specialization` (text)
- `bio` (text)
- `years_of_experience` (integer)
- `rating` (numeric)

**New Fields Required**:
- `education` (text) - e.g., "DDS, University of Toronto"
- `clinic_address` (text) - e.g., "Downtown Dental Care, Toronto, Canada"
- `available_times` (jsonb) - Schedule data
- `contact_email` (text) - Professional contact
- `profile_image_url` (text) - Photo URL

### 3. Today's Appointments Card Component

**File**: `admin-app/src/components/TodaysAppointments.tsx`

**Purpose**: Display all appointments scheduled for current day

**Props**:
```typescript
interface TodaysAppointmentsProps {
  dentistId: string;
}
```

**Data Structure**:
```typescript
interface TodayAppointment {
  id: string;
  patientName: string;
  appointmentTime: string;
  serviceType: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  patientId: string;
}
```

**Query Logic**:
```typescript
const fetchTodaysAppointments = async (dentistId: string) => {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      appointment_date,
      appointment_type,
      status,
      notes,
      profiles!appointments_patient_id_fkey (
        full_name
      )
    `)
    .eq('dentist_id', dentistId)
    .gte('appointment_date', `${today}T00:00:00`)
    .lte('appointment_date', `${today}T23:59:59`)
    .order('appointment_date', { ascending: true });
    
  return data;
};
```

**UI Design**:
- Card with gradient background matching admin theme
- List of appointments with patient info
- Time displayed in 12-hour format
- Status badges (color-coded)
- Empty state when no appointments

### 4. Updated Dentists Page (User Website)

**File**: `src/pages/Dentists.tsx`

**Current State**: Uses hardcoded mock data array

**New Implementation**: Fetch from Supabase dentists table

**Data Fetching**:
```typescript
const fetchDentists = async () => {
  const { data, error } = await supabase
    .from('dentists')
    .select(`
      id,
      specialization,
      bio,
      years_of_experience,
      rating,
      education,
      clinic_address,
      available_times,
      profiles!dentists_id_fkey (
        full_name,
        email
      )
    `)
    .order('rating', { ascending: false });
    
  return data;
};
```

**Display Logic**:
- Map database records to dentist cards
- Show Dr. Michael Chen alongside any other dentists
- Use profile_image_url or fallback to default images
- Link to detailed profile page with dentist ID

### 5. Admin Dashboard Integration

**File**: `admin-app/src/pages/Dashboard.tsx`

**Modifications**:
- Add TodaysAppointments component to dashboard
- Position below existing stats cards
- Pass authenticated dentist's ID as prop
- Update in real-time when appointments change

**Layout**:
```tsx
<DashboardLayout>
  <div className="space-y-8">
    {/* Existing stats cards */}
    <StatsGrid stats={stats} />
    
    {/* NEW: Today's Appointments */}
    <TodaysAppointments dentistId={user.id} />
    
    {/* Existing welcome card */}
    <WelcomeCard />
  </div>
</DashboardLayout>
```

## Data Models

### Dentist Profile (Complete)

```typescript
interface DentistProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  specialization: string;
  bio: string;
  yearsOfExperience: number;
  rating: number;
  education: string;
  clinicAddress: string;
  availableTimes: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  contactEmail: string;
  profileImageUrl?: string;
}
```

### Dr. Michael Chen Default Data

```typescript
const DR_MICHAEL_CHEN: DentistProfile = {
  fullName: "Dr. Michael Chen",
  email: "dr.michaelchen@clinic.com",
  phone: "+1 (416) 555-0123",
  specialization: "General & Cosmetic Dentistry",
  bio: "Friendly and precise dental professional focused on patient comfort and oral health.",
  yearsOfExperience: 10,
  rating: 5.0,
  education: "DDS, University of Toronto",
  clinicAddress: "Downtown Dental Care, Toronto, Canada",
  availableTimes: {
    monday: "09:00-17:00",
    tuesday: "09:00-17:00",
    wednesday: "09:00-17:00",
    thursday: "09:00-17:00",
    friday: "09:00-17:00",
    saturday: "10:00-14:00"
  },
  contactEmail: "dr.michaelchen@clinic.com",
  profileImageUrl: null // Will use default image
};
```

## Error Handling

### Migration Errors
- Check if user already exists before creating
- Use `ON CONFLICT DO NOTHING` for idempotent operations
- Log errors with RAISE NOTICE
- Rollback transaction on failure

### Authentication Errors
- Handle invalid credentials gracefully
- Display user-friendly error messages
- Redirect to login on auth failure
- Clear invalid session data

### Data Fetching Errors
- Show loading states while fetching
- Display error messages if queries fail
- Provide retry mechanisms
- Fallback to empty states

### Profile Sync Errors
- Validate data before saving
- Show success/error toasts
- Revert UI on save failure
- Log sync errors for debugging

## Testing Strategy

### Database Testing
- Verify migration creates all required records
- Test idempotency (running migration multiple times)
- Confirm RLS policies allow proper access
- Validate foreign key relationships

### Component Testing
- TodaysAppointments: Test with empty, single, and multiple appointments
- Dentists page: Test data fetching and rendering
- Admin dashboard: Verify today's appointments display
- Profile sync: Test update propagation

### Integration Testing
- End-to-end login flow for Dr. Chen
- Booking appointment and seeing it in admin dashboard
- Updating profile in admin and verifying on user site
- Filtering today's appointments correctly

### User Acceptance Testing
- Dr. Chen can log in with provided credentials
- Today's appointments show correct data
- Profile appears on user website Dentists page
- Profile updates sync between admin and user site
- Appointment times display in correct timezone

## Implementation Notes

### Password Hashing

Supabase uses bcrypt for password hashing. The migration must use:
```sql
crypt('securetest123', gen_salt('bf'))
```

### Timezone Handling

All appointment times stored in UTC. Display logic must convert to local timezone:
```typescript
const localTime = new Date(appointment.appointment_date).toLocaleTimeString('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
});
```

### Real-time Updates

Use Supabase real-time subscriptions for live appointment updates:
```typescript
const subscription = supabase
  .channel('appointments')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'appointments',
    filter: `dentist_id=eq.${dentistId}`
  }, handleAppointmentChange)
  .subscribe();
```

### Image Handling

Use default dentist images from assets folder if profile_image_url is null:
```typescript
const imageUrl = dentist.profile_image_url || dentist2;
```

### Available Times Display

Parse JSONB available_times and format for display:
```typescript
const formatAvailableTimes = (times: Record<string, string>) => {
  return Object.entries(times)
    .map(([day, hours]) => `${capitalize(day)}: ${hours}`)
    .join(', ');
};
```

## Security Considerations

- Password stored as bcrypt hash, never plaintext
- RLS policies restrict appointment access to dentist's own data
- Admin dashboard requires authentication
- Profile updates validate user permissions
- SQL injection prevented by parameterized queries
- CORS configured for port 3010 and 8000

## Performance Considerations

- Index on appointments.dentist_id for fast queries
- Index on appointments.appointment_date for date filtering
- Cache dentist profiles on user website
- Lazy load appointment details
- Paginate appointment history
- Optimize image sizes for profile photos
