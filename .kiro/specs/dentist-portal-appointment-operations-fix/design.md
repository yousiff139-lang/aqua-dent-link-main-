# Design Document

## Overview

This design document outlines the solution for fixing the "Mark as Completed" and "Cancel" appointment operations in the dentist portal. The current implementation has authorization issues where dentists cannot properly complete or cancel appointments due to mismatches between authentication methods and database authorization checks.

The core issue is that the dentist portal authenticates dentists through the `dentists` table (using email-based authentication), but the backend authorization logic primarily checks against `user_id` from the Supabase auth system. This mismatch causes 403 Forbidden errors even when dentists are legitimately accessing their own appointments.

## Architecture

### Current System Components

1. **Dentist Portal Frontend** (React/TypeScript)
   - `DentistDashboard.tsx`: Main dashboard displaying appointments
   - `appointment.service.ts`: Frontend service for API calls
   - Uses Supabase client for direct database queries

2. **Backend API** (Node.js/Express)
   - `appointments.routes.ts`: Route definitions
   - `appointments.controller.ts`: Request handling and validation
   - `appointments.service.ts`: Business logic and authorization
   - `appointments.repository.ts`: Database operations

3. **Database** (Supabase/PostgreSQL)
   - `appointments` table: Stores appointment data
   - `dentists` table: Dentist profiles
   - `profiles` table: User profiles (Supabase auth)
   - `user_roles` table: Role assignments

### Authentication Flow

**Current State:**
- Dentists authenticate via email/password through the dentists table
- Frontend stores dentist ID and email in local state
- Backend receives requests with Supabase auth token
- Authorization checks fail because dentist ID from dentists table doesn't match user_id from Supabase auth

**Target State:**
- Maintain email-based authentication for dentists
- Backend authorization checks both dentist ID and dentist email
- Support multiple authentication paths (Supabase auth + dentists table)

## Components and Interfaces

### Frontend Components

#### 1. DentistDashboard Component
**Purpose:** Display and manage appointments for authenticated dentists

**Current Issues:**
- Direct Supabase calls bypass backend authorization
- Status updates don't use the backend API consistently
- No proper error handling for authorization failures

**Required Changes:**
- Use `appointment.service.ts` for all operations
- Add proper error handling with user-friendly messages
- Implement loading states during operations
- Handle session expiration gracefully

#### 2. Appointment Service
**Purpose:** Centralized API communication layer

**Current State:**
```typescript
interface AppointmentService {
  markComplete(id: string): Promise<Appointment>
  cancel(id: string, reason?: string): Promise<void>
  updateStatus(id: string, status: string, notes?: string): Promise<Appointment>
}
```

**Required Enhancements:**
- Add retry logic for network failures
- Implement proper error classification
- Add authentication token management
- Handle 401/403 errors with appropriate user feedback

### Backend Components

#### 1. Appointments Controller
**Purpose:** Handle HTTP requests and responses

**Current Implementation:**
- Validates request parameters
- Delegates to service layer
- Returns standardized responses

**Required Changes:**
- Enhance error responses with actionable messages
- Add request logging for debugging
- Validate dentist authorization before processing

#### 2. Appointments Service
**Purpose:** Business logic and authorization

**Current Issues:**
- Authorization checks only match user_id
- Doesn't account for dentists table authentication
- Email matching logic is incomplete

**Required Changes:**
- Implement dual authorization check (ID + email)
- Query both dentists and profiles tables
- Add detailed authorization logging
- Return specific error codes for different failure types

#### 3. Appointments Repository
**Purpose:** Database operations

**Current State:**
- Handles CRUD operations
- Uses Supabase client directly

**Required Changes:**
- Add transaction support for status updates
- Implement optimistic locking for concurrent updates
- Add audit trail for status changes

## Data Models

### Appointment Model
```typescript
interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  dentist_id: string;
  dentist_email: string;
  dentist_name: string;
  appointment_date: string;
  appointment_time: string;
  appointment_type: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  payment_method: 'stripe' | 'cash';
  symptoms?: string;
  notes?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
}
```

### Authorization Context
```typescript
interface AuthContext {
  userId: string;          // From Supabase auth or dentists table
  userEmail: string;       // User's email address
  userRole: 'dentist' | 'patient' | 'admin';
  isDentist: boolean;      // From dentists table
  isAdmin: boolean;        // From user_roles table
}
```

### Error Response
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}
```

