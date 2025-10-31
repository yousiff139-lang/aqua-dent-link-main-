# Appointments API Documentation

## Overview

The Appointments API provides endpoints for creating, retrieving, updating, and canceling dental appointments. It supports both authenticated and guest bookings, with proper authorization checks to ensure users can only access their own appointments.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Most endpoints require authentication using a Bearer token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

The API supports two types of authentication:
1. **Supabase JWT tokens** - For patient users
2. **Custom JWT tokens** - For dentist portal users

## Endpoints

### 1. Create Appointment

Create a new appointment booking.

**Endpoint:** `POST /api/appointments`

**Authentication:** Optional (allows guest bookings)

**Request Body:**

```json
{
  "patient_name": "John Doe",
  "patient_email": "john.doe@example.com",
  "patient_phone": "+1234567890",
  "dentist_email": "dr.smith@dental.com",
  "dentist_id": "uuid-optional",
  "reason": "Regular checkup",
  "appointment_date": "2025-11-01",
  "appointment_time": "10:00",
  "payment_method": "stripe",
  "notes": "Optional notes",
  "patient_notes": "Optional patient notes",
  "medical_history": "Optional medical history"
}
```

**Validation Rules:**
- `patient_name`: Required, max 255 characters
- `patient_email`: Required, valid email format
- `patient_phone`: Required, max 50 characters
- `dentist_email`: Required, valid email format
- `dentist_id`: Optional UUID (will be looked up from email if not provided)
- `reason`: Required, reason for visit
- `appointment_date`: Required, format YYYY-MM-DD, cannot be in the past
- `appointment_time`: Required, format HH:mm (24-hour)
- `payment_method`: Required, either "stripe" or "cash"

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "appointmentId": "uuid",
    "status": "pending",
    "paymentStatus": "pending",
    "appointment": {
      "id": "uuid",
      "patient_name": "John Doe",
      "patient_email": "john.doe@example.com",
      "patient_phone": "+1234567890",
      "dentist_id": "uuid",
      "dentist_email": "dr.smith@dental.com",
      "reason": "Regular checkup",
      "appointment_date": "2025-11-01",
      "appointment_time": "10:00",
      "payment_method": "stripe",
      "payment_status": "pending",
      "status": "pending",
      "created_at": "2025-10-24T20:00:00Z",
      "updated_at": "2025-10-24T20:00:00Z"
    }
  }
}
```

**Error Responses:**

- `400 Bad Request` - Validation error
- `409 Conflict` - Time slot already booked
- `500 Internal Server Error` - Server error

---

### 2. Get Appointments by Dentist Email

Retrieve all appointments for a specific dentist with optional filters.

**Endpoint:** `GET /api/appointments/dentist/:dentistEmail`

**Authentication:** Required

**Authorization:** Only the dentist themselves or admins can access

**Path Parameters:**
- `dentistEmail`: The dentist's email address

**Query Parameters:**
- `status`: Filter by status (comma-separated: pending,confirmed,completed,cancelled)
- `date_from`: Filter appointments from this date (YYYY-MM-DD)
- `date_to`: Filter appointments until this date (YYYY-MM-DD)
- `limit`: Maximum number of results (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)

**Example Request:**

```
GET /api/appointments/dentist/dr.smith@dental.com?status=pending,confirmed&limit=10
Authorization: Bearer YOUR_JWT_TOKEN
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "patient_name": "John Doe",
      "patient_email": "john.doe@example.com",
      "patient_phone": "+1234567890",
      "dentist_id": "uuid",
      "dentist_email": "dr.smith@dental.com",
      "reason": "Regular checkup",
      "appointment_date": "2025-11-01",
      "appointment_time": "10:00",
      "payment_method": "stripe",
      "payment_status": "pending",
      "status": "pending",
      "created_at": "2025-10-24T20:00:00Z",
      "updated_at": "2025-10-24T20:00:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 10,
    "offset": 0,
    "hasMore": false
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid email format or query parameters
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Not authorized to access these appointments
- `500 Internal Server Error` - Server error

---

### 3. Get Appointments by Patient Email

Retrieve all appointments for a specific patient with optional filters.

**Endpoint:** `GET /api/appointments/patient/:email`

**Authentication:** Required

**Authorization:** Only the patient themselves or admins can access

**Path Parameters:**
- `email`: The patient's email address

**Query Parameters:**
- `status`: Filter by status (comma-separated: pending,confirmed,completed,cancelled)
- `date_from`: Filter appointments from this date (YYYY-MM-DD)
- `date_to`: Filter appointments until this date (YYYY-MM-DD)
- `limit`: Maximum number of results (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)

**Example Request:**

```
GET /api/appointments/patient/john.doe@example.com?status=pending
Authorization: Bearer YOUR_JWT_TOKEN
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "patient_name": "John Doe",
      "patient_email": "john.doe@example.com",
      "patient_phone": "+1234567890",
      "dentist_id": "uuid",
      "dentist_email": "dr.smith@dental.com",
      "reason": "Regular checkup",
      "appointment_date": "2025-11-01",
      "appointment_time": "10:00",
      "payment_method": "stripe",
      "payment_status": "pending",
      "status": "pending",
      "created_at": "2025-10-24T20:00:00Z",
      "updated_at": "2025-10-24T20:00:00Z"
    }
  ],
  "count": 1
}
```

**Error Responses:**

- `400 Bad Request` - Invalid email format or query parameters
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Not authorized to access these appointments
- `500 Internal Server Error` - Server error

---

### 4. Get Appointment by ID

Retrieve a specific appointment by its ID.

**Endpoint:** `GET /api/appointments/:id`

**Authentication:** Required

**Authorization:** Only the patient or dentist associated with the appointment can access

**Path Parameters:**
- `id`: The appointment UUID

**Example Request:**

```
GET /api/appointments/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer YOUR_JWT_TOKEN
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patient_name": "John Doe",
    "patient_email": "john.doe@example.com",
    "patient_phone": "+1234567890",
    "dentist_id": "uuid",
    "dentist_email": "dr.smith@dental.com",
    "reason": "Regular checkup",
    "appointment_date": "2025-11-01",
    "appointment_time": "10:00",
    "payment_method": "stripe",
    "payment_status": "pending",
    "status": "pending",
    "notes": "Optional notes",
    "created_at": "2025-10-24T20:00:00Z",
    "updated_at": "2025-10-24T20:00:00Z"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid UUID format
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Not authorized to view this appointment
- `404 Not Found` - Appointment not found
- `500 Internal Server Error` - Server error

---

### 5. Update Appointment

Update an existing appointment.

**Endpoint:** `PUT /api/appointments/:id`

**Authentication:** Required

**Authorization:** Only the patient or dentist associated with the appointment can update

**Path Parameters:**
- `id`: The appointment UUID

**Request Body:**

```json
{
  "appointment_date": "2025-11-02",
  "appointment_time": "14:00",
  "status": "confirmed",
  "payment_status": "paid",
  "notes": "Updated notes"
}
```

**Validation Rules:**
- `appointment_date`: Optional, format YYYY-MM-DD, cannot be in the past
- `appointment_time`: Optional, format HH:mm (24-hour)
- `status`: Optional, one of: pending, confirmed, completed, cancelled
- `payment_status`: Optional, one of: pending, paid, failed
- `notes`: Optional string

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patient_name": "John Doe",
    "patient_email": "john.doe@example.com",
    "patient_phone": "+1234567890",
    "dentist_id": "uuid",
    "dentist_email": "dr.smith@dental.com",
    "reason": "Regular checkup",
    "appointment_date": "2025-11-02",
    "appointment_time": "14:00",
    "payment_method": "stripe",
    "payment_status": "paid",
    "status": "confirmed",
    "notes": "Updated notes",
    "created_at": "2025-10-24T20:00:00Z",
    "updated_at": "2025-10-24T20:15:00Z"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Validation error or invalid date
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Not authorized to update this appointment
- `404 Not Found` - Appointment not found
- `409 Conflict` - New time slot already booked
- `500 Internal Server Error` - Server error

---

### 6. Cancel Appointment

Cancel an existing appointment (soft delete by setting status to cancelled).

**Endpoint:** `DELETE /api/appointments/:id`

**Authentication:** Required

**Authorization:** Only the patient or dentist associated with the appointment can cancel

**Path Parameters:**
- `id`: The appointment UUID

**Example Request:**

```
DELETE /api/appointments/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer YOUR_JWT_TOKEN
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Appointment cancelled successfully"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid UUID format
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Not authorized to cancel this appointment
- `404 Not Found` - Appointment not found
- `500 Internal Server Error` - Server error

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error details"
    },
    "timestamp": "2025-10-24T20:00:00Z"
  }
}
```

## Common Error Codes

- `UNAUTHORIZED` - Authentication required or invalid token
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request data
- `CONFLICT` - Resource conflict (e.g., time slot already booked)
- `SLOT_UNAVAILABLE` - Time slot is not available
- `INTERNAL_ERROR` - Server error

## Business Rules

1. **Slot Availability**: The system prevents double-booking by checking slot availability before creating or updating appointments.

2. **Past Date Validation**: Appointments cannot be created or rescheduled to dates in the past.

3. **Authorization**: 
   - Patients can only access their own appointments
   - Dentists can only access appointments for their practice
   - Admins can access all appointments

4. **Payment Status**: 
   - Cash payments start with status "pending"
   - Stripe payments are updated via webhooks

5. **Appointment Status Flow**:
   - `pending` → `confirmed` → `completed`
   - Can be `cancelled` at any time

## Rate Limiting

The API implements rate limiting to prevent abuse. Default limits:
- 100 requests per minute per IP address
- 1000 requests per hour per authenticated user

## CORS

The API supports CORS for the following origins:
- http://localhost:5174 (User Website)
- http://localhost:5173 (Dentist Portal)
- http://localhost:3010 (Admin App)

## Logging

All API requests are logged with:
- Request method and path
- Response status code
- Request duration
- User ID (if authenticated)
- IP address

Errors are logged with full stack traces for debugging.
