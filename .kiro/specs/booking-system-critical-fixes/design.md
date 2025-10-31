# Design Document

## Overview

This design addresses critical failures in the Dental Care Connect booking system caused by database schema mismatches and missing data integration. The system currently references a non-existent `appointment` table (singular) when the actual table is `appointments` (plural), causing all booking operations to fail with schema cache errors. Additionally, dentist profile pages use hardcoded mock data instead of fetching from the database, resulting in blank pages when attempting to load real dentist information.

The solution involves:
1. **Database Query Corrections**: Update all queries to use correct table names (`appointments`, `dentists`)
2. **Data Integration**: Replace mock data with real database queries using React Query
3. **Error Handling**: Implement comprehensive error handling and user feedback
4. **Schema Verification**: Create tools to validate database schema matches application expectations
5. **Migration Safety**: Ensure database migrations are idempotent and data-preserving

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Dentists   │  │   Dentist    │  │   Booking    │      │
│  │     Page     │  │   Profile    │  │     Form     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │  React Query    │                        │
│                   │  (Data Layer)   │                        │
│                   └────────┬────────┘                        │
└────────────────────────────┼─────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │ Supabase Client │
                    └────────┬────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                  Supabase Backend                             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ appointments │  │   dentists   │  │ user_roles   │      │
│  │    table     │  │    table     │  │    table     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │           RLS Policies & Constraints             │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Booking Flow:**
```
User fills form → Validate inputs → Check authentication → 
Insert into appointments table → Generate booking reference →
Handle payment (Stripe/Cash) → Show confirmation → 
Send notifications (PDF + Email)
```

**Dentist Profile Flow:**
```
Navigate to /dentist/:id → Fetch dentist from database →
Display profile data → User clicks "Book" → 
Show booking form with pre-filled dentist info
```

## Components and Interfaces

### 1. Database Schema Corrections

**Current Problem:**
- Code references `appointment` (singular)
- Actual table is `appointments` (plural)
- Causes "table not found in schema cache" errors

**Solution:**

All database queries must use the correct table names:
- `appointments` (not `appointment`)
- `dentists` (not `dentist`)
- `user_roles` (not `user_role`)

**Implementation:**
```typescript
// ❌ WRONG - causes schema cache error
const { data } = await supabase.from('appointment').select('*');

// ✅ CORRECT
const { data } = await supabase.from('appointments').select('*');
```

### 2. Dentist Data Integration

**Current Problem:**
- DentistProfile.tsx uses hardcoded MOCK array
- No database queries for dentist data
- Profile pages show mock data or blank screens

**Solution Architecture:**

```typescript
// hooks/useDentist.ts - Custom React Query hook
export function useDentist(dentistId: string) {
  return useQuery({
    queryKey: ['dentist', dentistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dentists')
        .select('*')
        .eq('id', dentistId)
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('Dentist not found');
      
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// hooks/useDentists.ts - Fetch all dentists
export function useDentists() {
  return useQuery({
    queryKey: ['dentists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dentists')
        .select('*')
        .order('rating', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

**Component Integration:**
```typescript
// pages/DentistProfile.tsx
const DentistProfile = () => {
  const { id } = useParams();
  const { data: dentist, isLoading, error } = useDentist(id!);
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!dentist) return <NotFound />;
  
  return <ProfileView dentist={dentist} />;
};
```

### 3. Booking Form Database Integration

**Current Implementation Analysis:**
The BookingForm.tsx already uses correct table name (`appointments`), but needs improvements:

**Issues to Fix:**
1. Error handling could be more specific
2. No retry logic for transient failures
3. Limited validation feedback

**Enhanced Implementation:**
```typescript
// services/bookingService.ts
export const bookingService = {
  async createAppointment(data: BookingData) {
    const { data: appointment, error } = await supabase
      .from('appointments') // ✅ Correct table name
      .insert({
        patient_id: data.patientId,
        dentist_id: data.dentistId,
        dentist_email: data.dentistEmail,
        patient_name: data.patientName,
        patient_email: data.patientEmail,
        patient_phone: data.patientPhone,
        appointment_date: data.date,
        appointment_time: data.time,
        chief_complaint: data.reason,
        symptoms: data.reason,
        status: 'upcoming',
        payment_method: data.paymentMethod,
        payment_status: 'pending',
        booking_reference: generateBookingReference(),
      })
      .select()
      .single();
    
    if (error) {
      console.error('Booking error:', error);
      throw new BookingError(error.message, error.code);
    }
    
    return appointment;
  },
  
  async checkSlotAvailability(dentistId: string, date: string, time: string) {
    const { data, error } = await supabase
      .from('appointments')
      .select('id')
      .eq('dentist_id', dentistId)
      .eq('appointment_date', date)
      .eq('appointment_time', time)
      .in('status', ['upcoming', 'confirmed', 'pending'])
      .maybeSingle();
    
    return !data; // true if available
  }
};
```

### 4. Schema Verification Tool

**Purpose:** Validate database schema matches application expectations

**Implementation:**
```typescript
// scripts/verifySchema.ts
interface SchemaCheck {
  table: string;
  requiredColumns: string[];
  optionalColumns?: string[];
}

const REQUIRED_SCHEMA: SchemaCheck[] = [
  {
    table: 'appointments',
    requiredColumns: [
      'id', 'patient_id', 'dentist_id', 'appointment_date',
      'appointment_time', 'status', 'payment_method', 'payment_status'
    ],
    optionalColumns: [
      'dentist_email', 'patient_name', 'patient_email', 'patient_phone',
      'chief_complaint', 'symptoms', 'booking_reference'
    ]
  },
  {
    table: 'dentists',
    requiredColumns: [
      'id', 'name', 'email', 'specialization'
    ],
    optionalColumns: [
      'rating', 'experience_years', 'bio', 'education',
      'expertise', 'image_url', 'phone', 'address'
    ]
  }
];

async function verifySchema() {
  for (const check of REQUIRED_SCHEMA) {
    // Check table exists
    const { data, error } = await supabase
      .from(check.table)
      .select('*')
      .limit(0);
    
    if (error) {
      console.error(`❌ Table '${check.table}' not found or inaccessible`);
      continue;
    }
    
    console.log(`✅ Table '${check.table}' exists`);
    
    // Verify columns by attempting a select
    // (Supabase doesn't expose schema metadata directly)
  }
}
```

## Data Models

### Appointments Table Schema
```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) NOT NULL,
  dentist_id UUID REFERENCES dentists(id),
  dentist_email TEXT,
  patient_name TEXT NOT NULL,
  patient_email TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'upcoming', 'completed', 'cancelled')),
  payment_method TEXT CHECK (payment_method IN ('stripe', 'cash')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  chief_complaint TEXT,
  symptoms TEXT,
  booking_reference TEXT UNIQUE,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Dentists Table Schema
```sql
CREATE TABLE dentists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  specialization TEXT,
  rating DECIMAL(3,2) DEFAULT 0.0,
  experience_years INTEGER DEFAULT 0,
  phone TEXT,
  address TEXT,
  bio TEXT,
  education TEXT,
  expertise TEXT[],
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### TypeScript Interfaces
```typescript
// types/dentist.ts
export interface Dentist {
  id: string;
  name: string;
  email: string;
  specialization: string;
  rating: number;
  experience_years: number;
  phone?: string;
  address?: string;
  bio?: string;
  education?: string;
  expertise?: string[];
  image_url?: string;
  created_at: string;
  updated_at: string;
}

// types/appointment.ts
export interface Appointment {
  id: string;
  patient_id: string;
  dentist_id?: string;
  dentist_email?: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'upcoming' | 'completed' | 'cancelled';
  payment_method: 'stripe' | 'cash';
  payment_status: 'pending' | 'paid' | 'refunded' | 'failed';
  chief_complaint?: string;
  symptoms?: string;
  booking_reference?: string;
  created_at: string;
  updated_at: string;
}
```

## Error Handling

### Error Classification

**1. Schema Errors**
- **Cause:** Wrong table name in query
- **Detection:** Error code `42P01` (undefined_table)
- **User Message:** "System configuration error. Please contact support."
- **Developer Action:** Log full error, check table name in code

**2. Not Found Errors**
- **Cause:** Dentist ID doesn't exist in database
- **Detection:** Query returns null/empty
- **User Message:** "Dentist not found. Please select another dentist."
- **Developer Action:** Redirect to dentists list page

**3. Authentication Errors**
- **Cause:** User not logged in or session expired
- **Detection:** `auth.uid()` returns null
- **User Message:** "Please sign in to book an appointment."
- **Developer Action:** Redirect to /auth page

**4. Validation Errors**
- **Cause:** Invalid form data (past date, invalid email, etc.)
- **Detection:** Zod schema validation fails
- **User Message:** Specific field error (e.g., "Email must be valid")
- **Developer Action:** Highlight invalid field, show inline error

**5. Conflict Errors**
- **Cause:** Time slot already booked
- **Detection:** Unique constraint violation or availability check fails
- **User Message:** "This time slot is no longer available. Please choose another time."
- **Developer Action:** Suggest alternative time slots

### Error Handling Strategy

```typescript
// utils/errorHandler.ts
export class BookingError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BookingError';
  }
}

export function handleDatabaseError(error: any): never {
  console.error('Database error:', error);
  
  // Schema error
  if (error.code === '42P01') {
    throw new BookingError(
      'System configuration error. Please contact support.',
      'SCHEMA_ERROR',
      { originalError: error }
    );
  }
  
  // RLS policy violation
  if (error.code === '42501') {
    throw new BookingError(
      'You do not have permission to perform this action.',
      'PERMISSION_DENIED'
    );
  }
  
  // Unique constraint violation
  if (error.code === '23505') {
    throw new BookingError(
      'This time slot is already booked. Please choose another time.',
      'SLOT_UNAVAILABLE'
    );
  }
  
  // Generic error
  throw new BookingError(
    error.message || 'An unexpected error occurred. Please try again.',
    'UNKNOWN_ERROR',
    { originalError: error }
  );
}
```

## Testing Strategy

### 1. Unit Tests
- Test database query functions with correct table names
- Test error handling for various error codes
- Test data transformation functions
- Test validation schemas

### 2. Integration Tests
- Test booking flow end-to-end
- Test dentist profile data fetching
- Test authentication flow
- Test payment integration

### 3. Schema Validation Tests
```typescript
// __tests__/schema.test.ts
describe('Database Schema', () => {
  it('should have appointments table', async () => {
    const { error } = await supabase
      .from('appointments')
      .select('id')
      .limit(1);
    
    expect(error).toBeNull();
  });
  
  it('should have dentists table', async () => {
    const { error } = await supabase
      .from('dentists')
      .select('id')
      .limit(1);
    
    expect(error).toBeNull();
  });
  
  it('should reject queries to non-existent appointment table', async () => {
    const { error } = await supabase
      .from('appointment') // singular - should fail
      .select('id')
      .limit(1);
    
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42P01');
  });
});
```

### 4. Manual Testing Checklist
- [ ] Navigate to dentists list page - verify dentists load from database
- [ ] Click "View Profile" - verify profile loads with real data
- [ ] Submit booking form - verify appointment created in database
- [ ] Check browser console - verify no schema cache errors
- [ ] Test with invalid dentist ID - verify error handling
- [ ] Test without authentication - verify redirect to login
- [ ] Test with past date - verify validation error
- [ ] Test with already booked slot - verify conflict handling

## Migration Strategy

### Safe Migration Approach

**Principle:** Never drop tables or columns that might contain data

**Migration File Structure:**
```sql
-- 1. Check if table exists before creating
CREATE TABLE IF NOT EXISTS appointments (...);

-- 2. Add columns conditionally
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' 
    AND column_name = 'booking_reference'
  ) THEN
    ALTER TABLE appointments ADD COLUMN booking_reference TEXT;
  END IF;
END $;

-- 3. Update constraints safely
ALTER TABLE appointments 
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE appointments 
  ADD CONSTRAINT appointments_status_check 
  CHECK (status IN ('pending', 'confirmed', 'upcoming', 'completed', 'cancelled'));

-- 4. Create indexes if not exists
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id 
  ON appointments(patient_id);
```

### Rollback Strategy

**If migration fails:**
1. Database changes are wrapped in transactions (automatic rollback)
2. Keep previous migration files for reference
3. Document any manual fixes needed

**If application breaks after migration:**
1. Revert code changes via git
2. Keep database as-is (data preserved)
3. Fix code to match current schema
4. Redeploy

## Performance Considerations

### Database Indexes
```sql
-- Critical indexes for query performance
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_dentist_id ON appointments(dentist_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_dentists_email ON dentists(email);
```

### Query Optimization
- Use `.single()` when expecting one result (faster than `.limit(1)`)
- Select only needed columns instead of `*` in production
- Use React Query caching to reduce database calls
- Implement pagination for large lists

### Caching Strategy
```typescript
// React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

## Security Considerations

### Row Level Security (RLS)
```sql
-- Patients can only view their own appointments
CREATE POLICY "Patients view own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

-- Dentists can view their assigned appointments
CREATE POLICY "Dentists view assigned appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = dentist_id 
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = appointments.dentist_email
    )
  );

-- Anyone can view dentist profiles (public information)
CREATE POLICY "Public can view dentists"
  ON dentists FOR SELECT
  TO authenticated, anon
  USING (true);
```

### Input Validation
- All form inputs validated with Zod schemas
- SQL injection prevented by Supabase parameterized queries
- XSS prevented by React's automatic escaping
- CSRF protection via Supabase auth tokens

## Deployment Plan

### Phase 1: Database Verification (Day 1)
1. Run schema verification script
2. Confirm all tables exist with correct names
3. Verify RLS policies are active
4. Check indexes are created

### Phase 2: Code Updates (Day 1-2)
1. Update all database queries to use correct table names
2. Replace mock data with React Query hooks
3. Implement error handling
4. Add loading states

### Phase 3: Testing (Day 2)
1. Run automated tests
2. Manual testing of booking flow
3. Manual testing of dentist profiles
4. Test error scenarios

### Phase 4: Deployment (Day 3)
1. Deploy to staging environment
2. Run smoke tests
3. Deploy to production
4. Monitor error logs

### Phase 5: Monitoring (Ongoing)
1. Monitor Supabase logs for errors
2. Track booking success rate
3. Monitor page load times
4. Collect user feedback

## Success Metrics

- **Booking Success Rate:** >95% of booking attempts succeed
- **Profile Load Time:** <2 seconds for dentist profile pages
- **Error Rate:** <1% of requests result in errors
- **Schema Cache Errors:** 0 occurrences
- **User Satisfaction:** Positive feedback on booking experience
