# Generate Booking Summary Edge Function

This Supabase Edge Function generates PDF and Excel documents for dental appointment bookings.

## Features

- **PDF Generation**: Creates professional PDF summaries with patient info, appointment details, symptoms, and medical history
- **Excel Generation**: Creates structured Excel sheets for dentist appointment management
- **Uncertainty Handling**: Prominently displays uncertainty notes when patients are unsure about symptom causes
- **Document Management**: Automatically uploads documents to Supabase Storage and updates appointment records
- **Cleanup**: Removes old documents when regenerating to prevent storage bloat

## API Endpoint

```
POST /generate-booking-summary
```

### Request Body

```json
{
  "appointmentId": "uuid-of-appointment",
  "generatePdf": true,      // Optional, defaults to true
  "generateExcel": false    // Optional, defaults to false
}
```

### Response

```json
{
  "success": true,
  "data": {
    "appointmentId": "...",
    "bookingReference": "ABC123",
    "patient": {
      "name": "John Doe",
      "phone": "+1234567890",
      "email": "john@example.com",
      "age": 35,
      "gender": "Male"
    },
    "dentist": {
      "name": "Dr. Smith",
      "email": "smith@dental.com",
      "phone": "+0987654321"
    },
    "appointmentDate": "2025-10-26T10:00:00Z",
    "appointmentType": "General Consultation",
    "status": "confirmed",
    "symptoms": "Tooth pain",
    "chiefComplaint": "Tooth pain",
    "causeIdentified": false,
    "uncertaintyNote": "Patient reports tooth pain but is unsure of the cause.",
    "medicalHistory": "No known allergies",
    "documents": [
      {
        "id": "...",
        "fileName": "xray.jpg",
        "fileUrl": "https://...",
        "fileType": "image/jpeg",
        "fileSize": 102400
      }
    ]
  },
  "pdfUrl": "https://storage.supabase.co/.../booking-summary-ABC123-1234567890.pdf",
  "excelUrl": "https://storage.supabase.co/.../appointment-sheet-dentist-id-2025-10-25-ABC123.xlsx"
}
```

## PDF Features

The generated PDF includes:

1. **Header**: Title and booking reference
2. **Patient Information**: Name, phone, email, age, gender
3. **Appointment Details**: Dentist, date/time, type, status
4. **Chief Complaint**: Patient's symptoms
5. **Uncertainty Note** (if applicable): Highlighted section when patient is unsure about cause
6. **Medical History** (if provided)
7. **Patient Notes** (if provided)
8. **Uploaded Documents**: List with clickable links
9. **Footer**: Generation timestamp and page numbers

### Uncertainty Note Display

When `causeIdentified` is `false`, the PDF displays a prominent highlighted box:

```
⚠ Important Note
Patient reports [symptom] but is unsure of the cause.
The dentist will help identify the cause during the appointment.
```

## Excel Features

The generated Excel sheet includes:

- Professional formatting with colored headers
- Sections for patient info, appointment details, symptoms, medical history, and documents
- Cell borders and proper column widths
- Wrapped text for long content
- Highlighted uncertainty notes (yellow background)

## Storage

Documents are stored in the `appointment-documents` bucket with:

- Public read access (with RLS policies)
- 10MB file size limit
- Allowed MIME types: PDF, Excel, JPEG, PNG
- Automatic cleanup of old documents (90+ days)

## Authentication

Requires a valid JWT token in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

## Access Control

- **Patients**: Can generate documents for their own appointments
- **Dentists**: Can generate documents for their appointments
- **Admins**: Can generate documents for any appointment

## Error Handling

The function handles errors gracefully:

- Missing appointment: Returns 404
- Unauthorized access: Returns 403
- Invalid token: Returns 401
- Generation errors: Returns summary data without document URLs

## Usage Example

```typescript
const response = await fetch('https://your-project.supabase.co/functions/v1/generate-booking-summary', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    appointmentId: 'appointment-uuid',
    generatePdf: true,
    generateExcel: true
  })
});

const result = await response.json();
console.log('PDF URL:', result.pdfUrl);
console.log('Excel URL:', result.excelUrl);
```

## Cleanup Function

A database function is available to clean up old documents:

```sql
SELECT public.cleanup_old_appointment_documents();
```

This should be run periodically (e.g., via cron job) to remove documents older than 90 days that are no longer referenced.

## Dependencies

- `jsPDF@2.5.1`: PDF generation
- `exceljs@4.4.0`: Excel generation
- `@supabase/supabase-js@2.39.3`: Supabase client

## Notes

- PDF generation uses jsPDF for client-side compatibility
- Excel generation uses ExcelJS for rich formatting
- Documents are automatically deleted when regenerated
- File names include booking reference and timestamp for uniqueness
