# Optimized Chatbot System - Design Document

## Overview

The optimized chatbot system provides a conversational AI interface for patients to book appointments, learn about dentists, and ask dental questions. The system uses a state machine approach to manage conversation flow and integrates with Supabase for data storage and Google Gemini AI for natural language processing.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
│  ┌────────────────────────────────────────────────┐    │
│  │         ChatbotModal Component                  │    │
│  │  - UI rendering                                 │    │
│  │  - User input handling                          │    │
│  │  - Message display                              │    │
│  └────────────────────────────────────────────────┘    │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ HTTP POST
                 ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase Edge Function                      │
│  ┌────────────────────────────────────────────────┐    │
│  │      Chatbot Conversation Manager               │    │
│  │  - State machine logic                          │    │
│  │  - Conversation flow control                    │    │
│  │  - Context management                           │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         Dentist Matching Engine                 │    │
│  │  - Keyword analysis                             │    │
│  │  - Specialization mapping                       │    │
│  │  - Recommendation logic                         │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         Booking Service                         │    │
│  │  - Appointment creation                         │    │
│  │  - Time slot validation                         │    │
│  │  - PDF generation                               │    │
│  └────────────────────────────────────────────────┘    │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ Supabase Client
                 ▼
┌─────────────────────────────────────────────────────────┐
│                 Supabase Database                        │
│  - appointments table                                    │
│  - chatbot_conversations table                          │
│  - dentists table                                        │
│  - profiles table                                        │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Conversation State Machine

**States:**
```typescript
enum ConversationState {
  GREETING = 'greeting',
  MENU_SELECTION = 'menu_selection',
  
  // Booking Flow
  BOOKING_SYMPTOM = 'booking_symptom',
  BOOKING_DENTIST_MATCH = 'booking_dentist_match',
  BOOKING_TIME_SELECTION = 'booking_time_selection',
  BOOKING_PATIENT_NAME = 'booking_patient_name',
  BOOKING_PATIENT_PHONE = 'booking_patient_phone',
  BOOKING_REVIEW = 'booking_review',
  BOOKING_PAYMENT = 'booking_payment',
  BOOKING_COMPLETE = 'booking_complete',
  
  // Dentist Info Flow
  DENTIST_INFO_QUERY = 'dentist_info_query',
  DENTIST_INFO_RESPONSE = 'dentist_info_response',
  
  // Dental Questions Flow
  DENTAL_QUESTION_QUERY = 'dental_question_query',
  DENTAL_QUESTION_RESPONSE = 'dental_question_response',
}
```

**Context Structure:**
```typescript
interface ConversationContext {
  // User Info
  patient_name: string | null;
  patient_phone: string | null;
  patient_email: string;
  
  // Booking Data
  symptom: string | null;
  cause_identified: boolean;
  uncertainty_note: string | null;
  recommended_dentist_id: string | null;
  recommended_dentist_name: string | null;
  recommended_dentist_specialization: string | null;
  selected_date: string | null;
  selected_time: string | null;
  payment_method: 'cash' | 'credit' | null;
  
  // Flow Control
  current_state: ConversationState;
  menu_choice: 'booking' | 'dentist_info' | 'dental_questions' | null;
  editing_field: string | null;
  
  // Metadata
  conversation_id: string;
  created_at: string;
  updated_at: string;
}
```

### 2. Dentist Matching Engine

**Keyword Mapping:**
```typescript
const SYMPTOM_TO_SPECIALIZATION = {
  // General Dentistry
  'cleaning': 'General Dentistry',
  'checkup': 'General Dentistry',
  'routine': 'General Dentistry',
  'exam': 'General Dentistry',
  
  // Endodontics (Pain/Root Canal)
  'pain': 'Endodontics',
  'toothache': 'Endodontics',
  'hurt': 'Endodontics',
  'ache': 'Endodontics',
  'root canal': 'Endodontics',
  'sensitive': 'Endodontics',
  
  // Orthodontics
  'braces': 'Orthodontics',
  'alignment': 'Orthodontics',
  'straighten': 'Orthodontics',
  'crooked': 'Orthodontics',
  'invisalign': 'Orthodontics',
  
  // Cosmetic Dentistry
  'whitening': 'Cosmetic Dentistry',
  'cosmetic': 'Cosmetic Dentistry',
  'veneers': 'Cosmetic Dentistry',
  'smile': 'Cosmetic Dentistry',
  'aesthetic': 'Cosmetic Dentistry',
  
  // Pediatric Dentistry
  'child': 'Pediatric Dentistry',
  'kid': 'Pediatric Dentistry',
  'pediatric': 'Pediatric Dentistry',
  'baby': 'Pediatric Dentistry',
  
  // Oral Surgery
  'wisdom': 'Oral Surgery',
  'extraction': 'Oral Surgery',
  'implant': 'Oral Surgery',
  'surgery': 'Oral Surgery',
  'broken': 'Oral Surgery',
  
  // Periodontics
  'gum': 'Periodontics',
  'bleeding': 'Periodontics',
  'swollen': 'Periodontics',
  'periodontitis': 'Periodontics',
};
```

**Matching Algorithm:**
```typescript
function matchDentist(symptom: string): DentistMatch {
  const lowerSymptom = symptom.toLowerCase();
  
  // Find matching specialization
  for (const [keyword, specialization] of Object.entries(SYMPTOM_TO_SPECIALIZATION)) {
    if (lowerSymptom.includes(keyword)) {
      // Find dentist with this specialization
      const dentist = findDentistBySpecialization(specialization);
      return {
        dentist_id: dentist.id,
        dentist_name: dentist.name,
        specialization: dentist.specialization,
        match_reason: `Based on "${keyword}" in your description`,
      };
    }
  }
  
  // Default to general dentist
  const generalDentist = findDentistBySpecialization('General Dentistry');
  return {
    dentist_id: generalDentist.id,
    dentist_name: generalDentist.name,
    specialization: 'General Dentistry',
    match_reason: 'General consultation recommended',
  };
}
```

### 3. Conversation Flow Handler

**Message Processing:**
```typescript
async function processMessage(
  userMessage: string,
  context: ConversationContext
): Promise<{ response: string; context: ConversationContext }> {
  
  switch (context.current_state) {
    case ConversationState.GREETING:
      return handleGreeting(userMessage, context);
      
    case ConversationState.MENU_SELECTION:
      return handleMenuSelection(userMessage, context);
      
    case ConversationState.BOOKING_SYMPTOM:
      return handleBookingSymptom(userMessage, context);
      
    case ConversationState.BOOKING_DENTIST_MATCH:
      return handleDentistMatch(userMessage, context);
      
    case ConversationState.BOOKING_TIME_SELECTION:
      return handleTimeSelection(userMessage, context);
      
    case ConversationState.BOOKING_PATIENT_NAME:
      return handlePatientName(userMessage, context);
      
    case ConversationState.BOOKING_PATIENT_PHONE:
      return handlePatientPhone(userMessage, context);
      
    case ConversationState.BOOKING_REVIEW:
      return handleBookingReview(userMessage, context);
      
    case ConversationState.BOOKING_PAYMENT:
      return handlePayment(userMessage, context);
      
    // ... other states
  }
}
```

### 4. PDF Generation Service

**PDF Structure:**
```
┌─────────────────────────────────────────┐
│     DENTAL CARE CONNECT                 │
│     Appointment Confirmation            │
├─────────────────────────────────────────┤
│                                         │
│  Booking Reference: APT-20251027-1234   │
│  Date Generated: October 27, 2025       │
│                                         │
├─────────────────────────────────────────┤
│  PATIENT INFORMATION                    │
├─────────────────────────────────────────┤
│  Name: John Doe                         │
│  Phone: +1-555-0123                     │
│  Email: john@example.com                │
│                                         │
├─────────────────────────────────────────┤
│  APPOINTMENT DETAILS                    │
├─────────────────────────────────────────┤
│  Dentist: Dr. Sarah Johnson             │
│  Specialization: General Dentistry      │
│  Date: November 5, 2025                 │
│  Time: 2:00 PM                          │
│                                         │
├─────────────────────────────────────────┤
│  REASON FOR VISIT                       │
├─────────────────────────────────────────┤
│  Symptoms: Tooth pain                   │
│  Cause Identified: No                   │
│  Note: Patient unsure of cause          │
│                                         │
├─────────────────────────────────────────┤
│  PAYMENT INFORMATION                    │
├─────────────────────────────────────────┤
│  Payment Method: Cash                   │
│  Payment Status: Pending                │
│                                         │
└─────────────────────────────────────────┘
```

**Implementation:**
```typescript
async function generateAppointmentPDF(appointment: Appointment): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  
  // Add header
  page.drawText('DENTAL CARE CONNECT', {
    x: 50,
    y: 750,
    size: 24,
    font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  });
  
  // Add sections
  addPatientInfo(page, appointment);
  addAppointmentDetails(page, appointment);
  addReasonForVisit(page, appointment);
  addPaymentInfo(page, appointment);
  
  // Save to Supabase Storage
  const pdfBytes = await pdfDoc.save();
  const fileName = `appointment-${appointment.id}.pdf`;
  const { data, error } = await supabase.storage
    .from('appointment-pdfs')
    .upload(fileName, pdfBytes);
  
  return data.path;
}
```

## Data Models

### Appointments Table
```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Patient Info
  patient_id UUID REFERENCES auth.users(id),
  patient_name TEXT NOT NULL,
  patient_email TEXT NOT NULL,
  patient_phone TEXT,
  
  -- Dentist Info
  dentist_id UUID REFERENCES dentists(id) NOT NULL,
  dentist_email TEXT NOT NULL,
  
  -- Appointment Details
  concern TEXT NOT NULL,
  cause_identified BOOLEAN DEFAULT true,
  uncertainty_note TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending',
  payment_method TEXT NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  
  -- PDF
  pdf_report_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Chatbot Conversations Table
```sql
CREATE TABLE chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES auth.users(id) NOT NULL,
  dentist_id UUID REFERENCES dentists(id),
  
  status TEXT DEFAULT 'active',
  messages JSONB DEFAULT '[]',
  context JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Error Handling

### Retry Logic
```typescript
async function saveWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      await sleep(1000 * attempt); // Exponential backoff
    }
  }
}
```

### Error Recovery
```typescript
function handleError(error: Error, context: ConversationContext): string {
  if (error.message.includes('slot unavailable')) {
    return "I'm sorry, that time slot just became unavailable. Let me show you other available times...";
  }
  
  if (error.message.includes('database')) {
    return "I'm having trouble saving your appointment. Let me try again...";
  }
  
  return "I encountered an issue. Please try again or contact support at support@dentalcare.com";
}
```

## Testing Strategy

### Unit Tests
- State transition logic
- Dentist matching algorithm
- Input validation
- PDF generation

### Integration Tests
- End-to-end booking flow
- Database operations
- PDF storage and retrieval
- Payment processing

### User Acceptance Tests
- Complete booking scenarios
- Error recovery flows
- Edge cases (uncertainty, missing data)
- Multi-language support (future)

## Performance Considerations

- **Response Time:** < 2 seconds per message
- **Concurrent Users:** Support 100+ simultaneous conversations
- **Database Queries:** Optimized with indexes on frequently queried fields
- **PDF Generation:** Async processing to avoid blocking
- **Caching:** Cache dentist data and available slots

## Security

- **Input Validation:** Sanitize all user inputs
- **SQL Injection:** Use parameterized queries
- **XSS Prevention:** Escape HTML in messages
- **Authentication:** Verify user JWT tokens
- **Rate Limiting:** 100 messages per minute per user
- **Data Privacy:** Encrypt sensitive patient data
