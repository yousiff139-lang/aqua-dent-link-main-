# Chatbot Booking System - API Documentation

## Overview

This document provides comprehensive documentation for all edge functions in the Chatbot Booking System. These serverless functions handle AI-powered conversations, document generation, and appointment management.

## Table of Contents

1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [Error Handling](#error-handling)
4. [Edge Functions](#edge-functions)
   - [chat-bot](#1-chat-bot)
   - [generate-booking-summary](#2-generate-booking-summary)
   - [generate-appointment-excel](#3-generate-appointment-excel)

---

## Authentication

All edge functions require authentication using JWT tokens from Supabase Auth.

### Headers Required

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Getting a JWT Token

Tokens are automatically provided by Supabase Auth after user login:

```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

---

## Rate Limiting

Rate limits are enforced per user to prevent abuse:

| Function | Limit | Window |
|----------|-------|--------|
| chat-bot | 100 requests | 1 minute |
| generate-booking-summary | 20 requests | 1 minute |
| generate-appointment-excel | 20 requests | 1 minute |

### Rate Limit Response

When rate limit is exceeded:

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 1234567890,
  "message": "Too many requests. Please try again later."
}
```

**Status Code:** `429 Too Many Requests`

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": "Error message",
  "details": "Additional error details",
  "requestId": "uuid-v4-request-id",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | Missing or invalid JWT token |
| `UNAUTHORIZED` | 403 | User lacks permission for resource |
| `INVALID_REQUEST` | 400 | Missing required fields or invalid data |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `AI_SERVICE_ERROR` | 500 | AI service unavailable |

---

## Edge Functions

### 1. chat-bot

AI-powered conversational interface for booking appointments.

#### Endpoint

```
POST https://<project-ref>.supabase.co/functions/v1/chat-bot
```

#### Description

Manages conversational booking flow using Google Gemini AI. Handles patient information collection, symptom assessment, uncertainty detection, time slot selection, and booking confirmation.

#### Request Body

```typescript
{
  messages: Array<{
    role: 'user' | 'assistant';
    content: string | Array<{
      type: string;
      text?: string;
      inline_data?: {
        mime_type: string;
        data: string; // base64 encoded
      }
    }>;
  }>;
  conversationId?: string; // UUID, optional for new conversations
  dentistId?: string; // UUID, required for new conversations
  dentistName?: string; // Required for new conversations
  files?: Array<{
    name: string;
    type: string;
    data: string; // base64 encoded
  }>;
}
```

#### Request Example

```json
{
  "messages": [
    {
      "role": "user",
      "content": "I want to book an appointment"
    }
  ],
  "dentistId": "123e4567-e89b-12d3-a456-426614174000",
  "dentistName": "Dr. Sarah Johnson"
}
```

#### Response Format

```typescript
{
  choices: Array<{
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string; // JSON string
        }
      }>;
    }
  }>;
  conversationId: string; // UUID
  conversationState: {
    step: string;
    dentistId?: string;
    dentistName?: string;
    phoneNumber?: string;
    symptoms?: string;
    causeIdentified?: boolean;
    uncertaintyNote?: string;
    selectedTimeSlot?: string;
    documents?: string[];
  };
}
```

#### Response Example - Text Message

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Hello! I'll help you book an appointment with Dr. Sarah Johnson. To get started, could you please provide your phone number?"
    }
  }],
  "conversationId": "987fcdeb-51a2-43f1-b456-789012345678",
  "conversationState": {
    "step": "phone_number",
    "dentistId": "123e4567-e89b-12d3-a456-426614174000",
    "dentistName": "Dr. Sarah Johnson"
  }
}
```

#### Response Example - Tool Call

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": null,
      "tool_calls": [{
        "id": "call_abc123",
        "type": "function",
        "function": {
          "name": "book_appointment",
          "arguments": "{\"dentist_id\":\"123e4567-e89b-12d3-a456-426614174000\",\"appointment_date\":\"2025-10-26T10:00:00Z\",\"appointment_type\":\"consultation\",\"symptoms\":\"tooth pain\",\"cause_identified\":false,\"uncertainty_note\":\"Patient reports tooth pain but is unsure of the cause\",\"phone_number\":\"+1234567890\"}"
        }
      }]
    }
  }],
  "conversationId": "987fcdeb-51a2-43f1-b456-789012345678",
  "conversationState": {
    "step": "confirmation",
    "dentistId": "123e4567-e89b-12d3-a456-426614174000",
    "phoneNumber": "+1234567890",
    "symptoms": "tooth pain",
    "causeIdentified": false,
    "uncertaintyNote": "Patient reports tooth pain but is unsure of the cause"
  }
}
```

#### Conversation Steps

The chatbot follows a structured flow:

1. **GREETING** - Initial welcome message
2. **PHONE_NUMBER** - Collect patient contact number
3. **SYMPTOMS** - Understand dental concerns
4. **CAUSE_CLARIFICATION** - Suggest possible causes (if applicable)
5. **DOCUMENTS** - Offer document upload (optional)
6. **TIME_SLOTS** - Display available times
7. **CONFIRMATION** - Confirm booking details
8. **COMPLETED** - Booking finalized

#### Uncertainty Handling

The chatbot detects uncertainty indicators:
- "I don't know"
- "not sure"
- "no idea"
- "unsure"
- "maybe"
- "could be"

When detected:
- Sets `causeIdentified: false`
- Records `uncertaintyNote` with symptom description
- Responds empathetically without re-asking
- Proceeds to next step

#### Available Tool Functions

##### get_dentists
Get list of available dentists.

```typescript
{
  name: "get_dentists",
  parameters: {
    specialization?: string
  }
}
```

##### get_availability
Get available time slots for a dentist.

```typescript
{
  name: "get_availability",
  parameters: {
    dentist_id: string; // UUID
    date?: string; // YYYY-MM-DD
  }
}
```

##### book_appointment
Book an appointment for the patient.

```typescript
{
  name: "book_appointment",
  parameters: {
    dentist_id: string; // UUID
    appointment_date: string; // ISO 8601
    appointment_type: string;
    symptoms: string;
    cause_identified: boolean;
    uncertainty_note?: string;
    phone_number: string;
  }
}
```

#### Error Responses

##### Missing API Key

```json
{
  "error": "AI service not configured. Please contact administrator.",
  "details": "GEMINI_API_KEY environment variable is missing"
}
```

**Status Code:** `500`

##### Invalid Conversation ID

```json
{
  "error": "Invalid conversationId format",
  "requestId": "uuid-v4"
}
```

**Status Code:** `400`

##### AI Service Failure (Fallback)

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "I'm having trouble connecting right now. Let me help you book an appointment. Could you please provide your phone number?"
    }
  }],
  "error": "Service temporarily unavailable"
}
```

**Status Code:** `500`

---

### 2. generate-booking-summary

Generate PDF and Excel documents for appointment summaries.

#### Endpoint

```
POST https://<project-ref>.supabase.co/functions/v1/generate-booking-summary
```

#### Description

Creates professional PDF booking summaries and Excel sheets for appointments. Includes patient information, appointment details, symptoms, uncertainty notes, medical history, and uploaded documents.

#### Request Body

```typescript
{
  appointmentId: string; // UUID, required
  generatePdf?: boolean; // Default: true
  generateExcel?: boolean; // Default: false
}
```

#### Request Example

```json
{
  "appointmentId": "456e7890-e12b-34d5-a678-901234567890",
  "generatePdf": true,
  "generateExcel": true
}
```

#### Response Format

```typescript
{
  success: boolean;
  data: {
    appointmentId: string;
    bookingReference: string;
    patient: {
      name: string;
      email: string;
      phone: string;
      age: number | null;
      gender: string;
      dateOfBirth: string | null;
    };
    dentist: {
      name: string;
      email: string;
      phone: string;
    };
    appointmentDate: string; // ISO 8601
    appointmentType: string;
    status: string;
    symptoms: string;
    chiefComplaint: string;
    causeIdentified: boolean;
    uncertaintyNote?: string;
    medicalHistory?: string;
    patientNotes?: string;
    documents: Array<{
      id: string;
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
      uploadedAt: string;
    }>;
    createdAt: string;
    updatedAt: string;
    conversationId?: string;
  };
  pdfUrl: string | null;
  excelUrl: string | null;
}
```

#### Response Example

```json
{
  "success": true,
  "data": {
    "appointmentId": "456e7890-e12b-34d5-a678-901234567890",
    "bookingReference": "BK-2025-ABC123",
    "patient": {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "age": 35,
      "gender": "Male",
      "dateOfBirth": "1990-01-15"
    },
    "dentist": {
      "name": "Dr. Sarah Johnson",
      "email": "sarah.johnson@clinic.com",
      "phone": "+0987654321"
    },
    "appointmentDate": "2025-10-26T10:00:00Z",
    "appointmentType": "General Consultation",
    "status": "confirmed",
    "symptoms": "tooth pain",
    "chiefComplaint": "tooth pain",
    "causeIdentified": false,
    "uncertaintyNote": "Patient reports tooth pain but is unsure of the cause.",
    "medicalHistory": "No known allergies",
    "documents": [
      {
        "id": "doc-123",
        "fileName": "xray.jpg",
        "fileUrl": "https://storage.supabase.co/...",
        "fileType": "image/jpeg",
        "fileSize": 245760,
        "uploadedAt": "2025-10-25T14:30:00Z"
      }
    ],
    "createdAt": "2025-10-25T14:00:00Z",
    "updatedAt": "2025-10-25T14:30:00Z"
  },
  "pdfUrl": "https://storage.supabase.co/.../booking-summary-BK-2025-ABC123-1729867890.pdf",
  "excelUrl": "https://storage.supabase.co/.../appointment-sheet-123e4567-2025-10-25-BK-2025-ABC123.xlsx"
}
```

#### PDF Document Structure

The generated PDF includes:

1. **Header**
   - Title: "Dental Appointment Summary"
   - Booking Reference Number

2. **Patient Information**
   - Name, Phone, Email
   - Age, Gender

3. **Appointment Details**
   - Dentist Name
   - Date & Time
   - Appointment Type
   - Status

4. **Chief Complaint**
   - Symptoms description

5. **Uncertainty Note** (if applicable)
   - Highlighted yellow box
   - Warning icon
   - Note about cause uncertainty
   - Explanation text

6. **Medical History** (if provided)
   - Patient's medical background

7. **Patient Notes** (if provided)
   - Additional notes

8. **Uploaded Documents**
   - List of documents with clickable links
   - File names, types, and sizes

9. **Footer**
   - Generation timestamp
   - Page numbers

#### Excel Sheet Structure

The generated Excel file includes:

- **Title Row**: "DENTAL APPOINTMENT SUMMARY"
- **Booking Reference**: Highlighted row
- **Patient Information Section**: Blue header with patient details
- **Appointment Details Section**: Blue header with appointment info
- **Symptoms Section**: Chief complaint with word wrap
- **Uncertainty Note** (if applicable): Yellow highlighted row with warning
- **Medical History Section** (if provided)
- **Uploaded Documents Section**: List of documents
- **Footer**: Generation timestamp

#### Access Control

Users can access appointment summaries if they are:
- The patient (patient_id matches user)
- The dentist (dentist_id matches user)
- An admin (has 'admin' role)

#### Error Responses

##### Unauthorized Access

```json
{
  "error": "Unauthorized: You do not have access to this appointment",
  "requestId": "uuid-v4"
}
```

**Status Code:** `403`

##### Appointment Not Found

```json
{
  "error": "Failed to fetch appointment: Appointment not found",
  "requestId": "uuid-v4"
}
```

**Status Code:** `404`

##### Invalid Appointment ID

```json
{
  "error": "Invalid appointmentId format",
  "requestId": "uuid-v4"
}
```

**Status Code:** `400`

---

### 3. generate-appointment-excel

Legacy function for generating CSV appointment data.

#### Endpoint

```
POST https://<project-ref>.supabase.co/functions/v1/generate-appointment-excel
```

#### Description

Generates a CSV file with appointment details. This is a simpler alternative to the full Excel generation in `generate-booking-summary`.

**Note:** This function is maintained for backward compatibility. For new implementations, use `generate-booking-summary` with `generateExcel: true`.

#### Request Body

```typescript
{
  appointmentId: string; // UUID, required
}
```

#### Request Example

```json
{
  "appointmentId": "456e7890-e12b-34d5-a678-901234567890"
}
```

#### Response Format

```typescript
{
  csvContent: string;
  base64: string;
  filename: string;
  dentistEmail: string;
}
```

#### Response Example

```json
{
  "csvContent": "Appointment Details\nPatient Name,John Doe\nPatient Email,john.doe@example.com\n...",
  "base64": "QXBwb2ludG1lbnQgRGV0YWlscwpQYXRpZW50IE5hbWUsS...",
  "filename": "appointment_456e7890-e12b-34d5-a678-901234567890_1729867890.csv",
  "dentistEmail": "sarah.johnson@clinic.com"
}
```

#### CSV Content Structure

```csv
Appointment Details
Patient Name,<name>
Patient Email,<email>
Patient Phone,<phone>
Dentist Name,<name>
Dentist Specialization,<specialization>
Appointment Date,<date>
Appointment Type,<type>
Symptoms,<symptoms>
Status,<status>
Booked via AI,<Yes/No>
```

#### Error Responses

##### Missing Authorization

```json
{
  "error": "No authorization header"
}
```

**Status Code:** `500`

---

## Security Considerations

### Input Sanitization

All edge functions sanitize input data to prevent:
- SQL injection
- XSS attacks
- Path traversal
- Command injection

### JWT Verification

JWT tokens are verified using Supabase Auth:
```typescript
const user = await verifyJWT(req, supabase);
```

### Row Level Security (RLS)

Database access is controlled through RLS policies:
- Users can only access their own conversations
- Patients can only view their appointments
- Dentists can only view appointments assigned to them
- Admins have full access

### File Upload Security

Document uploads are validated for:
- File type (PDF, JPG, PNG only)
- File size (max 10MB)
- Malicious content

### Rate Limiting

Implemented per-user rate limiting prevents:
- API abuse
- DDoS attacks
- Resource exhaustion

---

## Best Practices

### 1. Error Handling

Always handle errors gracefully:

```typescript
try {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('API Error:', error);
    // Handle error appropriately
  }
  
  const result = await response.json();
  return result;
} catch (error) {
  console.error('Network Error:', error);
  // Handle network error
}
```

### 2. Retry Logic

Implement exponential backoff for transient failures:

```typescript
async function callWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
}
```

### 3. Conversation State Management

Maintain conversation state on the client:

```typescript
const [conversationId, setConversationId] = useState<string | null>(null);
const [messages, setMessages] = useState<Message[]>([]);

const sendMessage = async (content: string) => {
  const newMessages = [...messages, { role: 'user', content }];
  setMessages(newMessages);
  
  const response = await fetch('/functions/v1/chat-bot', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: newMessages,
      conversationId,
      dentistId,
      dentistName
    })
  });
  
  const data = await response.json();
  setConversationId(data.conversationId);
  setMessages([...newMessages, data.choices[0].message]);
};
```

### 4. Document Generation

Request document generation after booking confirmation:

```typescript
const generateDocuments = async (appointmentId: string) => {
  const response = await fetch('/functions/v1/generate-booking-summary', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      appointmentId,
      generatePdf: true,
      generateExcel: true
    })
  });
  
  const { pdfUrl, excelUrl } = await response.json();
  return { pdfUrl, excelUrl };
};
```

---

## Support

For issues or questions:
- Check error messages and request IDs
- Review server logs in Supabase Dashboard
- Verify environment variables are configured
- Ensure database migrations are applied

## Version History

- **v1.0.0** (2025-10-25): Initial release with chat-bot, generate-booking-summary, and generate-appointment-excel functions
