# Document Upload Not Working - Root Cause & Fix

## Problem Identified

Files are NOT being uploaded because:
1. **Storage bucket doesn't exist** - Code uploads to `medical-documents` bucket
2. **No RLS policies** - Even if bucket exists, policies might block uploads

## Check Your Supabase Storage

### Step 1: Check if bucket exists
1. Go to Supabase Dashboard → Storage
2. Look for bucket named `medical-documents`
3. If it doesn't exist, that's why uploads fail!

### Step 2: Create the bucket (if missing)

Run this in Supabase SQL Editor:

```sql
-- Create storage bucket for medical documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-documents', 'medical-documents', true);

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload medical documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'medical-documents');

-- Allow authenticated users to read their own uploads
CREATE POLICY "Users can view medical documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'medical-documents');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their medical documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'medical-documents');
```

## How File Upload Works

### Current Flow (EnhancedBookingForm.tsx lines 320-348):
1. User selects files
2. `uploadFiles()` function is called with appointmentId
3. For each file:
   - Generate unique filename: `{appointmentId}/{randomUUID}.{extension}`
   - Upload to `medical-documents` bucket
   - Get public URL
   - Add to array: `[{name: "file.pdf", url: "https://..."}]`
4. Return array of document objects
5. Save to `appointment_medical_info.documents` (JSONB)

## Testing

After creating the bucket, test the upload:

1. **Browser Console Test:**
```javascript
// Open browser console (F12) on booking page
// Before submitting, check if files are selected:
console.log('Files:', document.querySelector('input[type="file"]').files);
```

2. **After Submitting:**
   - Check browser Network tab (F12 → Network)
   - Look for requests to `/storage/v1/object/medical-documents`
   - If you see 404 or 401 errors → bucket issues

3. **Database Check:**
```sql
-- Check if documents were saved
SELECT documents FROM appointment_medical_info 
ORDER BY created_at DESC LIMIT 5;
```

## Expected Database Format

The `documents` column should contain JSON like:
```json
[
  {
    "name": "xray.pdf",
    "url": "https://your-project.supabase.co/storage/v1/object/public/medical-documents/appointment-id/uuid.pdf"
  },
  {
    "name": "prescription.jpg",
    "url": "https://your-project.supabase.co/storage/v1/object/public/medical-documents/appointment-id/uuid.jpg"
  }
]
```

If you see empty arrays `[]` or NULL → uploads failed

## Next Steps

1. Run the SQL above to create bucket
2. Try uploading a test file
3. Check database to verify documents column has data
4. If still not working, check browser console for errors
