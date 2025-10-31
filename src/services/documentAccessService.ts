/**
 * Document Access Service
 * Handles secure document access with signed URLs and permission validation
 */

import { supabase } from '@/integrations/supabase/client';

export interface SignedUrlResult {
  signedUrl: string;
  expiresAt: string;
  error?: string;
}

export interface DocumentAccessValidation {
  hasAccess: boolean;
  error?: string;
}

/**
 * Generate a signed URL for secure document access
 * @param documentPath - Path to the document in storage
 * @param appointmentId - Associated appointment ID
 * @param expirationSeconds - URL expiration time in seconds (default: 1 hour, max: 24 hours)
 * @returns Signed URL with expiration time
 */
export async function generateSignedDocumentUrl(
  documentPath: string,
  appointmentId: string,
  expirationSeconds: number = 3600
): Promise<SignedUrlResult> {
  try {
    // Validate expiration time
    if (expirationSeconds > 86400) {
      return {
        signedUrl: '',
        expiresAt: '',
        error: 'Expiration time cannot exceed 24 hours'
      };
    }

    // First, validate user has access via database function
    const { data: validationData, error: validationError } = await supabase
      .rpc('generate_signed_document_url', {
        p_document_path: documentPath,
        p_appointment_id: appointmentId,
        p_expiration_seconds: expirationSeconds
      });

    if (validationError) {
      console.error('Error validating document access:', validationError);
      return {
        signedUrl: '',
        expiresAt: '',
        error: validationError.message
      };
    }

    // Extract filename from path
    const filename = documentPath.split('/').pop() || documentPath;

    // Generate signed URL using Supabase Storage
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('appointment-documents')
      .createSignedUrl(filename, expirationSeconds);

    if (signedUrlError) {
      console.error('Error generating signed URL:', signedUrlError);
      return {
        signedUrl: '',
        expiresAt: '',
        error: signedUrlError.message
      };
    }

    // Log document access
    await logDocumentAccess(filename, appointmentId, 'view');

    return {
      signedUrl: signedUrlData.signedUrl,
      expiresAt: validationData?.[0]?.expires_at || new Date(Date.now() + expirationSeconds * 1000).toISOString()
    };
  } catch (error) {
    console.error('Error in generateSignedDocumentUrl:', error);
    return {
      signedUrl: '',
      expiresAt: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validate if current user has access to a document
 * @param documentUrl - Full URL or path to the document
 * @returns Validation result
 */
export async function validateDocumentAccess(
  documentUrl: string
): Promise<DocumentAccessValidation> {
  try {
    const { data, error } = await supabase
      .rpc('validate_document_access', {
        p_document_url: documentUrl
      });

    if (error) {
      console.error('Error validating document access:', error);
      return {
        hasAccess: false,
        error: error.message
      };
    }

    return {
      hasAccess: data === true
    };
  } catch (error) {
    console.error('Error in validateDocumentAccess:', error);
    return {
      hasAccess: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Download a document with access validation
 * @param documentPath - Path to the document
 * @param appointmentId - Associated appointment ID
 * @param filename - Optional custom filename for download
 */
export async function downloadDocument(
  documentPath: string,
  appointmentId: string,
  filename?: string
): Promise<void> {
  try {
    // Generate signed URL with 5-minute expiration for download
    const result = await generateSignedDocumentUrl(documentPath, appointmentId, 300);

    if (result.error || !result.signedUrl) {
      throw new Error(result.error || 'Failed to generate download URL');
    }

    // Log download access
    const documentName = documentPath.split('/').pop() || documentPath;
    await logDocumentAccess(documentName, appointmentId, 'download');

    // Trigger download
    const link = document.createElement('a');
    link.href = result.signedUrl;
    link.download = filename || documentName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading document:', error);
    throw error;
  }
}

/**
 * Upload a document with access validation
 * @param file - File to upload
 * @param appointmentId - Associated appointment ID
 * @param userId - User uploading the document
 * @returns Upload result with file URL
 */
export async function uploadDocument(
  file: File,
  appointmentId: string,
  userId: string
): Promise<{ fileUrl: string; error?: string }> {
  try {
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        fileUrl: '',
        error: 'File size exceeds 10MB limit'
      };
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        fileUrl: '',
        error: 'File type not allowed. Allowed types: PDF, Excel, JPG, PNG'
      };
    }

    // Generate unique filename with user folder structure
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${userId}/${appointmentId}/${timestamp}-${sanitizedFilename}`;

    // Upload file
    const { data, error } = await supabase.storage
      .from('appointment-documents')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading document:', error);
      return {
        fileUrl: '',
        error: error.message
      };
    }

    // Get public URL (will require signed URL for access due to RLS)
    const { data: urlData } = supabase.storage
      .from('appointment-documents')
      .getPublicUrl(filename);

    // Log upload access
    await logDocumentAccess(filename, appointmentId, 'upload');

    return {
      fileUrl: urlData.publicUrl
    };
  } catch (error) {
    console.error('Error in uploadDocument:', error);
    return {
      fileUrl: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Log document access for audit purposes
 * @param documentName - Name of the document
 * @param appointmentId - Associated appointment ID
 * @param accessType - Type of access (view, download, upload, delete)
 */
async function logDocumentAccess(
  documentName: string,
  appointmentId: string,
  accessType: 'view' | 'download' | 'upload' | 'delete'
): Promise<void> {
  try {
    // Determine document type from filename
    let documentType: 'booking_summary' | 'excel_sheet' | 'patient_upload' = 'patient_upload';
    if (documentName.includes('booking-summary')) {
      documentType = 'booking_summary';
    } else if (documentName.includes('appointment-sheet')) {
      documentType = 'excel_sheet';
    }

    const { error } = await supabase
      .from('document_access_log')
      .insert({
        document_name: documentName,
        document_type: documentType,
        appointment_id: appointmentId,
        access_type: accessType
      });

    if (error) {
      console.error('Error logging document access:', error);
      // Don't throw - logging failure shouldn't block the operation
    }
  } catch (error) {
    console.error('Error in logDocumentAccess:', error);
    // Don't throw - logging failure shouldn't block the operation
  }
}

/**
 * Get document access logs for an appointment (admin/dentist only)
 * @param appointmentId - Appointment ID
 * @returns Array of access log entries
 */
export async function getDocumentAccessLogs(appointmentId: string) {
  try {
    const { data, error } = await supabase
      .from('document_access_log')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching document access logs:', error);
      return { logs: [], error: error.message };
    }

    return { logs: data || [], error: null };
  } catch (error) {
    console.error('Error in getDocumentAccessLogs:', error);
    return {
      logs: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
