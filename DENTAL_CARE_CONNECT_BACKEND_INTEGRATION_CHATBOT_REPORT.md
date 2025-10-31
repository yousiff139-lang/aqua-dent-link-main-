# Dental Care Connect — Backend Integration and Chatbot Logic Report

**Version:** 1.0  
**Date:** October 27, 2025  
**System Status:** Production Ready

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Data Flow During Booking](#2-data-flow-during-booking)
3. [Backend Architecture](#3-backend-architecture)
4. [Synchronization Mechanisms](#4-synchronization-mechanisms)
5. [Chatbot Logic for Dental Clinic](#5-chatbot-logic-for-dental-clinic)
6. [API Endpoints Reference](#6-api-endpoints-reference)
7. [Database Schema](#7-database-schema)
8. [Security and Reliability](#8-security-and-reliability)
9. [Real-time Features](#9-real-time-features)
10. [Future Enhancements](#10-future-enhancements)

---

## 1. System Overview

Dental Care Connect uses a **unified backend architecture** built with **Node.js/Express** and **TypeScript** that coordinates three primary front-end systems:

| Component | Purpose | Audience | Technology Stack |
|-----------|---------|----------|------------------|
| **Public Booking Website** | Patient portal for viewing dentists, services, and booking appointments | Patients | React + Vite + TypeScript |
| **Admin Dashboard** | Management interface for appointments, payments, and patient data | Clinic Staff | React + Vite + TypeScript |
| **Dentist Portal** | Professional dashboard for dentist appointment management and availability | Dentists | React + Vite + TypeScript |
| **Chatbot Assistant** | Conversational AI layer for symptom collection and doctor recommendations | Patients | Supabase Edge Functions + OpenAI |

### Core Architecture Principles

- **Single Source of Truth**: All data flows through Supabase PostgreSQL database
- **RESTful API Design**: Standardized endpoints with consistent response formats
- **No Data Duplication**: Every insert, update, and read uses shared repositories
- **Type Safety**: Full TypeScript implementation across all layers
- **Real-time Sync**: Supabase Realtime subscriptions for instant updates

---

## 2. Data Flow During Booking

### 2.1 User Initiates Booking (Public Site or Chatbot)

**Patient provides:**
- Name (`patient_name`)
- Phone number (`patient_phone`)
- Email (`patient_email`)
- Dental concern/symptoms (`concern`)
- Preferred time (`appointment_date`, `appointment_time`)
- Payment method (`payment_method`: cash, card, insurance)

### 2.2 Frontend → Backend Request

**Endpoint:** `POST /api/appointments`

**Example Request Payload:**
```json
{
  "patient_name": "Ali Kareem",
  "patient_email": "ali@example.com",
  "patient_phone": "0771234567",
  "dentist_email": "dr.sarah@dentalcare.com",
  "concern": "tooth pain",
  "appointment_date": "2025-11-02",
  "appointment_time": "14:30",
  "payment_method": "cash"
}
```

### 2.3 Backend Processing Pipeline

**File:** `backend/src/controllers/appointments.controller.ts`

**Processing Steps:**

1. **Authentication Check** (Optional for guest bookings)
2. **Rate Limiting** (Prevents booking abuse via `bookingLimiter`)
3. **Input Validation** (`validationService.validateCreateAppointment`)
4. **Slot Availability Check** (Prevents double-booking)
5. **Dentist Lookup** (Fetches `dentist_id` from `profiles` table)
6. **Database Insert** (Creates appointment record)
7. **Real-time Broadcast** (Notifies admin dashboard instantly)

### 2.4 Database Storage

**Table:** `appointments`

```sql
INSERT INTO appointments (
  patient_name,
  patient_email,
  patient_phone,
  dentist_id,
  dentist_email,
  appointment_date,
  appointment_time,
  concern,
  payment_method,
  status,
  payment_status
) VALUES (
  'Ali Kareem',
  'ali@example.com',
  '0771234567',
  '<dentist-uuid>',
  'dr.sarah@dentalcare.com',
  '2025-11-02',
  '14:30',
  'tooth pain',
  'cash',
  'pending',
  'pending'
);
```

### 2.5 Admin Dashboard Synchronization

**Real-time Update Flow:**

1. **Database Trigger**: New appointment insert fires PostgreSQL trigger
2. **Realtime Channel**: Supabase broadcasts change to subscribed clients
3. **Admin Dashboard**: Receives real-time event and updates UI
4. **Notification**: Toast notification appears for new booking

**Alternative: Polling Method**
```typescript
// Admin dashboard calls every 10 seconds
GET /api/appointments/dentist/:dentistEmail?status=pending&limit=20
```

### 2.6 Admin Actions

**Status Update:**
```http
PUT /api/appointments/:id
Content-Type: application/json

{
  "status": "confirmed"
}
```

**Backend Response:**
- Updates database row
- Broadcasts change via Supabase Realtime
- Triggers notification to patient and dentist

### 2.7 Notification Flow

**Implementation:** `src/services/notificationService.ts`

```typescript
// After booking confirmation
await sendBookingConfirmation({
  patientEmail: appointment.patient_email,
  dentistName: dentist.full_name,
  appointmentTime: appointment.appointment_time
})
```

---

## 3. Backend Architecture

### 3.1 Layer Architecture

```
┌─────────────────────────────────────────────────┐
│           Client Applications                    │
│  (Public Site │ Admin │ Dentist Portal)         │
└────────────────┬────────────────────────────────┘
                 │
                 │ HTTPS/REST
                 ▼
┌─────────────────────────────────────────────────┐
│          Express Application Layer               │
│  ┌───────────────────────────────────────────┐  │
│  │  Middleware Pipeline                       │  │
│  │  - CORS                                    │  │
│  │  - Rate Limiting                           │  │
│  │  - Request Logging                         │  │
│  │  - Authentication (JWT)                    │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │  Controllers Layer                         │  │
│  │  - appointmentsController                  │  │
│  │  - dentistController                       │  │
│  │  - paymentsController                      │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │  Services Layer                            │  │
│  │  - appointmentsService                     │  │
│  │  - validationService                       │  │
│  │  - paymentService                          │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │  Repository Layer                          │  │
│  │  - appointmentsRepository                  │  │
│  │  - profilesRepository                      │  │
│  └───────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────┘
                 │
                 │ Supabase Client
                 ▼
┌─────────────────────────────────────────────────┐
│          Supabase PostgreSQL Database           │
│  - appointments                                  │
│  - profiles                                      │
│  - dentists                                      │
│  - chatbot_conversations                         │
└─────────────────────────────────────────────────┘
```

### 3.2 Key Files and Components

#### **Application Entry Point**
- **File:** `backend/src/app.ts`
- **Responsibilities:**
  - Express server configuration
  - CORS handling for multiple origins
  - Global error handling
  - Health check endpoint (`/health`)
  - Rate limiting middleware

#### **Controllers**
- **File:** `backend/src/controllers/appointments.controller.ts`
- **Endpoints:**
  - `POST /api/appointments` - Create appointment
  - `GET /api/appointments/dentist/:dentistEmail` - Get dentist appointments
  - `GET /api/appointments/patient/:email` - Get patient appointments
  - `GET /api/appointments/:id` - Get single appointment
  - `PUT /api/appointments/:id` - Update appointment
  - `DELETE /api/appointments/:id` - Cancel appointment

#### **Services**
- **File:** `backend/src/services/appointments.service.ts`
- **Key Methods:**
  - `createAppointment()` - Validates and creates appointments
  - `checkSlotAvailability()` - Prevents double-booking
  - `getAlternativeSlots()` - Suggests alternative times
  - `updateAppointment()` - Handles reschedules
  - `cancelAppointment()` - Soft deletes appointments

#### **Repositories**
- **File:** `backend/src/repositories/appointments.repository.ts`
- **Data Access Layer:**
  - `create()` - Insert new appointment
  - `findById()` - Retrieve by ID
  - `findByDentistEmail()` - Filter by dentist
  - `findByPatientEmail()` - Filter by patient
  - `update()` - Modify existing record
  - `delete()` - Set status to 'cancelled'

### 3.3 Environment Configuration

**File:** `backend/src/config/env.ts`

```typescript
{
  NODE_ENV: 'production',
  PORT: 3001,
  API_PREFIX: '/api',
  
  // Supabase
  SUPABASE_URL: 'https://[project].supabase.co',
  SUPABASE_ANON_KEY: '[anon-key]',
  SUPABASE_SERVICE_ROLE_KEY: '[service-key]',
  
  // Security
  CORS_ORIGIN: 'http://localhost:8000,http://localhost:3010',
  
  // Payment
  STRIPE_SECRET_KEY: 'sk_...',
  DEFAULT_APPOINTMENT_AMOUNT: 5000, // $50.00 in cents
  
  // Logging
  LOG_LEVEL: 'info'
}
```

---

## 4. Synchronization Mechanisms

### 4.1 Real-time Subscriptions (Primary Method)

**Admin Dashboard Implementation:**

```typescript
// Subscribe to appointment changes
const channel = supabase
  .channel('appointments-changes')
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'appointments'
    },
    (payload) => {
      console.log('Change detected:', payload)
      // Refresh appointment list
      queryClient.invalidateQueries(['appointments'])
    }
  )
  .subscribe()
```

**Benefits:**
- Instant updates (< 100ms latency)
- No polling overhead
- Battery efficient
- WebSocket-based

### 4.2 Polling Fallback

**Used when real-time unavailable:**

```typescript
// Fetch every 10 seconds
useEffect(() => {
  const fetchAppointments = async () => {
    const response = await fetch(
      `${API_URL}/appointments/dentist/${dentistEmail}?status=pending`
    )
    const data = await response.json()
    setAppointments(data.data)
  }

  fetchAppointments()
  const interval = setInterval(fetchAppointments, 10000)

  return () => clearInterval(interval)
}, [dentistEmail])
```

### 4.3 Data Consistency

- **ACID Transactions**: PostgreSQL guarantees atomicity
- **Row-Level Security**: Prevents unauthorized access
- **Unique Constraints**: Prevents double-booking on same time slot
- **Optimistic Locking**: Detects concurrent modifications

---

## 5. Chatbot Logic for Dental Clinic

### 5.1 Chatbot Architecture

```
┌─────────────────────────────────────┐
│  Patient (Public Website)           │
└──────────┬──────────────────────────┘
           │
           │ HTTP POST
           ▼
┌─────────────────────────────────────┐
│  Supabase Edge Function             │
│  Location: supabase/functions/      │
│            chat-bot/index.ts        │
│  Runtime: Deno                      │
└──────────┬──────────────────────────┘
           │
           ├─► OpenAI API (Optional)
           ├─► Doctor Matching Engine
           └─► Booking Service
```

### 5.2 Conversation Workflow

#### **Step 1: Greeting & Intent Detection**

**Bot Message:**
```
"Hi! Welcome to Dental Care Connect. I'm here to help you book an appointment. 
What brings you in today?"
```

**Patient Input Examples:**
- "I have tooth pain"
- "I need teeth whitening"
- "My gums are bleeding"

**Keyword Detection:**
```typescript
const DENTAL_SYMPTOMS_CAUSES = {
  'tooth pain': ['cavity', 'infection', 'gum disease', 'cracked tooth'],
  'toothache': ['cavity', 'infection', 'gum disease'],
  'sensitive': ['worn enamel', 'exposed root', 'cavity'],
  'bleeding gums': ['gingivitis', 'periodontitis'],
  'swollen': ['infection', 'abscess', 'gum disease'],
  'broken tooth': ['trauma', 'decay', 'old filling failure'],
  'jaw pain': ['TMJ disorder', 'teeth grinding'],
  'whitening': ['cosmetic procedure'],
  'braces': ['orthodontic treatment']
}
```

#### **Step 2: Doctor Recommendation**

**Specialist Mapping:**

| Symptom | Specialist | Doctor |
|---------|-----------|--------|
| Tooth pain | Endodontist | Dr. Sarah Al-Rashid |
| Teeth whitening | Cosmetic Dentist | Dr. Ahmed Majeed |
| Gum bleeding | Periodontist | Dr. Lina Kareem |
| Braces | Orthodontist | Dr. Nour Al-Tamimi |
| Broken tooth | Restorative Dentist | Dr. Omar Hadi |
| General | General Dentist | Dr. Hasan Ali |

**Implementation:**
```typescript
const DOCTOR_MATCHES = [
  {
    name: "Dr. Sarah Al-Rashid",
    specialization: "Endodontist",
    keywords: ["tooth pain", "toothache", "root canal", "sensitive"]
  },
  {
    name: "Dr. Ahmed Majeed",
    specialization: "Cosmetic Dentistry",
    keywords: ["whitening", "cosmetic", "smile", "veneers"]
  }
]

function matchDoctor(concern: string): DoctorMatch {
  const lower = concern.toLowerCase()
  return DOCTOR_MATCHES.find(doc => 
    doc.keywords.some(kw => lower.includes(kw))
  ) || DOCTOR_MATCHES[0] // Default to general dentist
}
```

#### **Step 3: Uncertainty Handling**

**Uncertainty Detection:**
```typescript
const UNCERTAINTY_INDICATORS = [
  'i don\'t know',
  'not sure',
  'no idea',
  'unsure',
  'idk',
  'maybe',
  'could be'
]

function detectUncertainty(message: string): boolean {
  const lower = message.toLowerCase()
  return UNCERTAINTY_INDICATORS.some(ind => lower.includes(ind))
}
```

**Example Conversation:**
```
Patient: "I have tooth pain but I'm not sure what's causing it"

Bot: "I understand. Based on tooth pain, it could be:
      • Cavity
      • Infection
      • Gum disease
      • Cracked tooth
      
      I'll note this as 'uncertain cause' and Dr. Sarah Al-Rashid 
      (Pain Specialist) will diagnose during your appointment.
      
      Shall we continue with booking?"

// Database fields set:
{
  "cause_identified": false,
  "uncertainty_note": "Patient reports tooth pain but is unsure of the cause"
}
```

#### **Step 4: Context Memory**

**Conversation State Storage:**
```typescript
interface ConversationContext {
  // User Info
  user_name: string | null
  phone_number: string | null
  phone_number_provided: boolean
  
  // Concern
  concern: string | null
  concern_described: boolean
  
  // Doctor
  recommended_doctor: string | null
  dentist_id: string | null
  dentist_selected: boolean
  
  // Appointment
  appointment_date: string | null
  appointment_time: string | null
  appointment_time_selected: boolean
  
  // Payment
  payment_method: 'cash' | 'card' | 'insurance' | null
  payment_selected: boolean
  
  // Flow Control
  wants_to_provide_later: boolean
  current_stage: 'greeting' | 'concern' | 'doctor_match' | 
                 'time_selection' | 'payment' | 'confirmation'
}
```

**Persisted in Database:**
```typescript
await supabase
  .from('chatbot_conversations')
  .insert({
    patient_id: user.id,
    dentist_id: context.dentist_id,
    status: 'active',
    messages: [...messages, newMessage],
    context: context
  })
```

#### **Step 5: Time Slot Suggestion**

**API Call to Backend:**
```typescript
const response = await fetch(
  `${API_URL}/availability/dentist/${dentistId}?date=${selectedDate}`
)

const { data: slots } = await response.json()
```

**Bot Presentation:**
```
Bot: "Great! Dr. Sarah has these available times on November 2:
      1. 9:00 AM
      2. 2:30 PM
      3. 4:00 PM
      
      Which time works best for you?"

Patient: "2"

Bot: "Perfect! 2:30 PM on November 2 is reserved for you."
```

#### **Step 6: Payment & Documents**

**Payment Collection:**
```
Bot: "How would you like to pay for the appointment?
      • Cash
      • Card (online payment)
      • Insurance"

Patient: "Cash"
```

**Document Upload (Optional):**
```
Bot: "Would you like to upload any medical documents or X-rays? 
      You can skip by typing 'no'."

Patient: [uploads file]

// Stored in Supabase Storage
// Reference saved in appointments.documents JSONB column
```

#### **Step 7: Final Confirmation**

**Summary Display:**
```
✅ Appointment Confirmed!

Doctor: Dr. Sarah Al-Rashid (Endodontist)
Date: November 2, 2025
Time: 2:30 PM
Concern: Tooth pain (cause uncertain - to be diagnosed)
Payment: Cash
Contact: 0771234567
Reference: APT-20251102-1430

✉️ Confirmation email sent to ali@example.com
```

**Database Write:**
```typescript
await fetch(`${API_URL}/appointments`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    patient_name: context.user_name,
    patient_email: user.email,
    patient_phone: context.phone_number,
    dentist_id: context.dentist_id,
    dentist_email: 'dr.sarah@dentalcare.com',
    concern: context.concern,
    cause_identified: !uncertaintyDetected,
    uncertainty_note: uncertaintyDetected 
      ? `Patient reports ${context.concern} but is unsure of the cause`
      : null,
    appointment_date: context.appointment_date,
    appointment_time: context.appointment_time,
    payment_method: context.payment_method,
    status: 'pending'
  })
})
```

### 5.3 Flexibility Features

#### **"I'll Provide Later" Handling**

```
Patient: "I'll give my phone number later"

Bot: "No problem! We can continue without it. 
      Please describe your dental concern."

// System continues to next critical step
context.wants_to_provide_later = true
```

#### **Dynamic Step Ordering**

```typescript
function determineNextStep(context: ConversationContext): string {
  // Skip non-critical steps if user wants to provide later
  if (context.wants_to_provide_later) {
    if (!context.concern_described) return "Ask about concern"
    if (!context.dentist_selected) return "Suggest dentist"
    if (!context.appointment_time_selected) return "Show time slots"
  }
  
  // Normal sequential flow
  if (!context.phone_number_provided) return "Ask for phone"
  if (!context.concern_described) return "Ask about concern"
  if (!context.dentist_selected) return "Suggest dentist"
  if (!context.appointment_time_selected) return "Show time slots"
  if (!context.payment_selected) return "Ask payment method"
  
  return "Confirm booking"
}
```

### 5.4 Error Handling

**API Unreachable:**
```typescript
if (!response.ok) {
  return {
    message: "I'm having trouble connecting to our booking system. " +
             "Please try again or call us at 0771234567.",
    messageType: MessageType.TEXT
  }
}
```

**Slot Unavailable:**
```typescript
if (error.code === 'SLOT_UNAVAILABLE') {
  const alternatives = error.details.alternativeSlots
  return {
    message: `That time is no longer available. Alternatives:\n` +
             alternatives.map((s, i) => `${i+1}. ${s.time}`).join('\n'),
    messageType: MessageType.TIME_SLOTS,
    data: alternatives
  }
}
```

---

## 6. API Endpoints Reference

### 6.1 Appointments API

#### **Create Appointment**
```http
POST /api/appointments
Authorization: Bearer <token> (optional for guests)
Content-Type: application/json

Request Body:
{
  "patient_name": "Ali Kareem",
  "patient_email": "ali@example.com",
  "patient_phone": "0771234567",
  "dentist_email": "dr.sarah@dentalcare.com",
  "concern": "tooth pain",
  "appointment_date": "2025-11-02",
  "appointment_time": "14:30",
  "payment_method": "cash"
}

Response 201:
{
  "success": true,
  "data": {
    "appointmentId": "uuid",
    "status": "pending",
    "paymentStatus": "pending",
    "appointment": { ... }
  }
}

Error 409 (Slot Unavailable):
{
  "success": false,
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "The selected time slot is no longer available",
    "details": {
      "alternativeSlots": [
        { "date": "2025-11-02", "time": "09:00" },
        { "date": "2025-11-02", "time": "16:00" }
      ]
    }
  }
}
```

#### **Get Dentist Appointments**
```http
GET /api/appointments/dentist/:dentistEmail
  ?status=pending,confirmed
  &date_from=2025-11-01
  &date_to=2025-11-30
  &limit=20
  &offset=0
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "patient_name": "Ali Kareem",
      "patient_email": "ali@example.com",
      "concern": "tooth pain",
      "appointment_date": "2025-11-02",
      "appointment_time": "14:30",
      "status": "pending"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

#### **Update Appointment**
```http
PUT /api/appointments/:id
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "status": "confirmed"
}

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "confirmed",
    "updated_at": "2025-11-01T10:30:00Z"
  }
}
```

#### **Cancel Appointment**
```http
DELETE /api/appointments/:id
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "message": "Appointment cancelled successfully"
}
```

### 6.2 Availability API

```http
GET /api/availability/dentist/:dentistId?date=2025-11-02

Response 200:
{
  "success": true,
  "data": {
    "available_slots": [
      { "time": "09:00", "available": true },
      { "time": "14:30", "available": false },
      { "time": "16:00", "available": true }
    ]
  }
}
```

### 6.3 Payment API

```http
POST /api/payments/create-intent
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "appointmentId": "uuid",
  "amount": 5000,
  "currency": "usd"
}

Response 200:
{
  "success": true,
  "data": {
    "clientSecret": "pi_...",
    "paymentIntentId": "pi_..."
  }
}
```

---

## 7. Database Schema

### 7.1 Appointments Table

```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Patient Information
  patient_id UUID REFERENCES auth.users(id),
  patient_name TEXT NOT NULL,
  patient_email TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  
  -- Dentist Information
  dentist_id UUID REFERENCES profiles(id) NOT NULL,
  dentist_email TEXT NOT NULL,
  
  -- Appointment Details
  concern TEXT NOT NULL,
  cause_identified BOOLEAN DEFAULT true,
  uncertainty_note TEXT,
  medical_history TEXT,
  
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  
  -- Payment
  payment_method TEXT NOT NULL
    CHECK (payment_method IN ('cash', 'card', 'insurance')),
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed')),
  payment_intent_id TEXT,
  
  -- Documents
  documents JSONB DEFAULT '[]',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent double-booking
  UNIQUE (dentist_id, appointment_date, appointment_time)
);

-- Indexes for performance
CREATE INDEX idx_appointments_patient_email ON appointments(patient_email);
CREATE INDEX idx_appointments_dentist_email ON appointments(dentist_email);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_created_at ON appointments(created_at);
```

### 7.2 Chatbot Conversations Table

```sql
CREATE TABLE chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES auth.users(id) NOT NULL,
  dentist_id UUID REFERENCES profiles(id),
  
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'abandoned')),
  
  messages JSONB DEFAULT '[]',
  context JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chatbot_patient ON chatbot_conversations(patient_id);
CREATE INDEX idx_chatbot_status ON chatbot_conversations(status);
```

### 7.3 Profiles Table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'patient'
    CHECK (role IN ('patient', 'dentist', 'admin')),
  
  avatar_url TEXT,
  phone TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 7.4 Row-Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Patients can view their own appointments
CREATE POLICY "patients_view_own" ON appointments
  FOR SELECT
  USING (auth.uid() = patient_id);

-- Dentists can view their appointments
CREATE POLICY "dentists_view_own" ON appointments
  FOR SELECT
  USING (auth.uid() = dentist_id);

-- Admins can view all
CREATE POLICY "admins_view_all" ON appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow guest bookings (insert only)
CREATE POLICY "allow_guest_bookings" ON appointments
  FOR INSERT
  WITH CHECK (true);

-- Users can update their own appointments
CREATE POLICY "users_update_own" ON appointments
  FOR UPDATE
  USING (auth.uid() IN (patient_id, dentist_id));
```

---

## 8. Security and Reliability

### 8.1 Security Measures

#### **Authentication**
- JWT tokens via Supabase Auth
- Token expiration: 1 hour
- Refresh token rotation
- HTTP-only secure cookies

#### **Authorization**
- Role-based access control (RBAC)
- Row-level security (RLS) policies
- Endpoint-level permission checks

#### **Input Validation**
```typescript
// Zod schema validation
const createAppointmentSchema = z.object({
  patient_name: z.string().min(1).max(100),
  patient_email: z.string().email(),
  patient_phone: z.string().regex(/^\d{10,15}$/),
  dentist_email: z.string().email(),
  concern: z.string().min(1).max(500),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  appointment_time: z.string().regex(/^\d{2}:\d{2}$/),
  payment_method: z.enum(['cash', 'card', 'insurance'])
})
```

#### **Rate Limiting**
```typescript
// General API: 100 requests per 15 minutes
apiLimiter: {
  windowMs: 15 * 60 * 1000,
  max: 100
}

// Booking: 10 appointments per hour
bookingLimiter: {
  windowMs: 60 * 60 * 1000,
  max: 10
}
```

#### **SQL Injection Prevention**
- Parameterized queries via Supabase client
- Automatic input escaping
- No raw SQL from user input

#### **CORS Protection**
```typescript
cors({
  origin: [
    'http://localhost:8000',
    'http://localhost:3010',
    'https://dentalcare.com'
  ],
  credentials: true
})
```

### 8.2 Reliability Features

#### **Retry Logic**
```typescript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await sleep(1000 * Math.pow(2, i))
    }
  }
}
```

#### **Error Handling**
```typescript
class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message)
  }
  
  static validation(message: string) {
    return new AppError(message, 'VALIDATION_ERROR', 400)
  }
  
  static slotUnavailable(message: string, details?: any) {
    return new AppError(message, 'SLOT_UNAVAILABLE', 409, details)
  }
}
```

#### **Logging**
```typescript
logger.info('Appointment created', {
  appointmentId,
  patientEmail,
  dentistEmail,
  date,
  time
})

logger.error('Failed to create appointment', {
  error,
  requestData
})
```

#### **Database Backups**
- Automated daily backups via Supabase
- Point-in-time recovery available
- Retention: 7 days (free tier), 30+ days (pro)

---

## 9. Real-time Features

### 9.1 Supabase Realtime Implementation

**Backend Configuration:**
```typescript
// File: backend/src/services/realtime.service.ts

export class RealtimeService {
  async broadcastAppointmentChange(appointmentId: string) {
    // Database trigger automatically broadcasts
    // No manual broadcast needed
  }
}
```

**Frontend Subscription:**
```typescript
// Admin Dashboard
const subscribeToAppointments = () => {
  return supabase
    .channel('appointments')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'appointments'
      },
      (payload) => {
        // Handle real-time update
        if (payload.eventType === 'INSERT') {
          toast.success('New appointment received!')
        }
        queryClient.invalidateQueries(['appointments'])
      }
    )
    .subscribe()
}
```

### 9.2 Real-time Use Cases

1. **New Booking Notification**
   - Admin sees instant toast when patient books
   - Appointment appears in list immediately

2. **Status Change Sync**
   - Dentist confirms appointment
   - Patient sees "Confirmed" status instantly

3. **Availability Updates**
   - Dentist blocks time slot
   - Booking form updates available times

4. **Payment Confirmation**
   - Stripe webhook updates payment status
   - Admin dashboard reflects "Paid" immediately

---

## 10. Future Enhancements

### 10.1 Planned Features

#### **Real-time Notifications (WebSockets)**
- Push notifications to mobile apps
- Desktop notifications for admin
- SMS alerts via Twilio

#### **Analytics Dashboard**
- Daily booking statistics
- Revenue tracking
- Dentist performance metrics
- Patient demographics

#### **Multilingual Support**
- Chatbot in English/Arabic
- Auto-detect language preference
- Translatable UI components

#### **Auto-Reminders**
- Email 24 hours before appointment
- SMS 2 hours before
- Push notification 30 minutes before

#### **AI-Powered Features**
- Advanced symptom analysis via GPT-4
- Automatic appointment rescheduling
- Intelligent doctor recommendations

#### **Mobile Apps**
- React Native patient app
- Dentist portal mobile app
- Offline mode support

### 10.2 Scalability Improvements

- **Caching Layer**: Redis for frequently accessed data
- **CDN Integration**: Cloudflare for static assets
- **Database Optimization**: Read replicas for reporting
- **Load Balancing**: Multiple backend instances

---

## Summary

**Dental Care Connect** operates on a unified backend architecture where:

1. **Public booking site**, **admin dashboard**, **dentist portal**, and **chatbot** all use the same REST API
2. All data flows through **Supabase PostgreSQL** - no duplication
3. **Real-time synchronization** via Supabase Realtime ensures instant updates
4. **Chatbot** uses intelligent symptom matching and uncertainty handling
5. **Type-safe** TypeScript implementation across all layers
6. **Production-ready** with authentication, authorization, rate limiting, and error handling

Every booking flows from user → API → database → real-time broadcast → all clients, ensuring perfect synchronization and seamless user experience.

---

**End of Report**
