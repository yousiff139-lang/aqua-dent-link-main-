import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
// Using jsPDF for PDF generation
import jsPDF from 'https://esm.sh/jspdf@2.5.1';
// Using ExcelJS for Excel generation
import ExcelJS from 'https://esm.sh/exceljs@4.4.0';
import {
  corsHeaders,
  handleCorsPreflightRequest,
  verifyJWT,
  checkRateLimit,
  getClientIdentifier,
  createRateLimitResponse,
  sanitizeObject,
  isValidUUID,
  createErrorResponse,
  createSuccessResponse,
  validateRequestBody,
  validateRequiredFields,
  logRequest,
  logError
} from '../_shared/security.ts';

// Removed verifyUser function - now using verifyJWT from security module

/**
 * Delete old document from storage if it exists
 */
async function deleteOldDocument(supabase: any, url: string | null) {
  if (!url) return;
  
  try {
    // Extract filename from URL
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    
    if (filename) {
      const { error } = await supabase.storage
        .from('appointment-documents')
        .remove([filename]);
      
      if (error) {
        console.error('Error deleting old document:', error);
      } else {
        console.log('Deleted old document:', filename);
      }
    }
  } catch (error) {
    console.error('Error in deleteOldDocument:', error);
  }
}

/**
 * Fetch complete appointment data with all related information
 */
async function fetchAppointmentData(supabase: any, appointmentId: string) {
  try {
    // Fetch appointment with patient, dentist, and document information
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:profiles!appointments_patient_id_fkey(
          full_name,
          email,
          phone,
          date_of_birth,
          gender
        ),
        dentist:profiles!appointments_dentist_id_fkey(
          full_name,
          email,
          phone
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError) {
      throw new Error(`Failed to fetch appointment: ${appointmentError.message}`);
    }

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Fetch appointment documents
    const { data: documents, error: documentsError } = await supabase
      .from('appointment_documents')
      .select('*')
      .eq('appointment_id', appointmentId);

    if (documentsError) {
      console.error('Error fetching documents:', documentsError);
      // Don't throw, just log - documents are optional
    }

    return {
      appointment,
      documents: documents || []
    };
  } catch (error) {
    console.error('Error in fetchAppointmentData:', error);
    throw error;
  }
}

/**
 * Calculate patient age from date of birth
 */
function calculateAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Generate PDF booking summary
 */
function generatePDF(summaryData: any): Uint8Array {
  const doc = new jsPDF();
  let yPosition = 20;
  const lineHeight = 7;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Helper function to add text with word wrap
  const addText = (text: string, x: number, y: number, options?: any) => {
    const lines = doc.splitTextToSize(text, contentWidth - (x - margin));
    doc.text(lines, x, y, options);
    return lines.length * lineHeight;
  };

  // Helper function to check if we need a new page
  const checkNewPage = (requiredSpace: number = 20) => {
    if (yPosition + requiredSpace > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      yPosition = 20;
    }
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Dental Appointment Summary', margin, yPosition);
  yPosition += lineHeight * 2;

  // Booking Reference
  if (summaryData.bookingReference) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Booking Reference: ${summaryData.bookingReference}`, margin, yPosition);
    yPosition += lineHeight * 1.5;
  }

  // Horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += lineHeight;

  // Patient Information Section
  checkNewPage();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Patient Information', margin, yPosition);
  yPosition += lineHeight;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${summaryData.patient.name}`, margin + 5, yPosition);
  yPosition += lineHeight;
  doc.text(`Phone: ${summaryData.patient.phone}`, margin + 5, yPosition);
  yPosition += lineHeight;
  doc.text(`Email: ${summaryData.patient.email}`, margin + 5, yPosition);
  yPosition += lineHeight;
  
  if (summaryData.patient.age) {
    doc.text(`Age: ${summaryData.patient.age} years`, margin + 5, yPosition);
    yPosition += lineHeight;
  }
  
  if (summaryData.patient.gender && summaryData.patient.gender !== 'N/A') {
    doc.text(`Gender: ${summaryData.patient.gender}`, margin + 5, yPosition);
    yPosition += lineHeight;
  }
  yPosition += lineHeight * 0.5;

  // Appointment Details Section
  checkNewPage();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Appointment Details', margin, yPosition);
  yPosition += lineHeight;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Dentist: ${summaryData.dentist.name}`, margin + 5, yPosition);
  yPosition += lineHeight;
  
  const appointmentDate = new Date(summaryData.appointmentDate);
  doc.text(`Date & Time: ${appointmentDate.toLocaleString('en-US', { 
    dateStyle: 'full', 
    timeStyle: 'short' 
  })}`, margin + 5, yPosition);
  yPosition += lineHeight;
  
  doc.text(`Type: ${summaryData.appointmentType}`, margin + 5, yPosition);
  yPosition += lineHeight;
  doc.text(`Status: ${summaryData.status}`, margin + 5, yPosition);
  yPosition += lineHeight * 1.5;

  // Chief Complaint Section
  checkNewPage();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Chief Complaint', margin, yPosition);
  yPosition += lineHeight;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const complaintHeight = addText(summaryData.chiefComplaint, margin + 5, yPosition);
  yPosition += complaintHeight + lineHeight * 0.5;

  // Uncertainty Note Section (if applicable)
  if (!summaryData.causeIdentified && summaryData.uncertaintyNote) {
    checkNewPage(30);
    
    // Add a highlighted box for uncertainty note
    doc.setFillColor(255, 243, 205); // Light yellow background
    doc.rect(margin, yPosition - 5, contentWidth, 25, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(184, 134, 11); // Dark golden color
    doc.text('⚠ Important Note', margin + 5, yPosition);
    yPosition += lineHeight;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0); // Reset to black
    const noteHeight = addText(summaryData.uncertaintyNote, margin + 5, yPosition);
    yPosition += noteHeight + lineHeight;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('The dentist will help identify the cause during the appointment.', margin + 5, yPosition);
    yPosition += lineHeight * 1.5;
    
    doc.setFont('helvetica', 'normal');
  }

  // Medical History Section (if provided)
  if (summaryData.medicalHistory) {
    checkNewPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Medical History', margin, yPosition);
    yPosition += lineHeight;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const historyHeight = addText(summaryData.medicalHistory, margin + 5, yPosition);
    yPosition += historyHeight + lineHeight * 0.5;
  }

  // Patient Notes Section (if provided)
  if (summaryData.patientNotes) {
    checkNewPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Patient Notes', margin, yPosition);
    yPosition += lineHeight;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const notesHeight = addText(summaryData.patientNotes, margin + 5, yPosition);
    yPosition += notesHeight + lineHeight * 0.5;
  }

  // Documents Section
  if (summaryData.documents && summaryData.documents.length > 0) {
    checkNewPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Uploaded Documents', margin, yPosition);
    yPosition += lineHeight;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    summaryData.documents.forEach((doc_item: any, index: number) => {
      checkNewPage();
      const fileSize = doc_item.fileSize ? `(${(doc_item.fileSize / 1024).toFixed(2)} KB)` : '';
      doc.text(`${index + 1}. ${doc_item.fileName} ${fileSize}`, margin + 5, yPosition);
      yPosition += lineHeight * 0.8;
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`   Type: ${doc_item.fileType || 'Unknown'}`, margin + 5, yPosition);
      yPosition += lineHeight * 0.8;
      
      // Add clickable link
      doc.setTextColor(0, 0, 255);
      doc.textWithLink('   View Document', margin + 5, yPosition, { url: doc_item.fileUrl });
      yPosition += lineHeight * 1.2;
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Generated on ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Return PDF as Uint8Array
  return doc.output('arraybuffer');
}

/**
 * Generate Excel sheet for appointment
 */
async function generateExcel(summaryData: any): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Appointment Details');

  // Set column widths
  worksheet.columns = [
    { key: 'field', width: 25 },
    { key: 'value', width: 50 }
  ];

  // Add title row
  const titleRow = worksheet.addRow(['DENTAL APPOINTMENT SUMMARY', '']);
  titleRow.font = { size: 16, bold: true };
  titleRow.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.mergeCells('A1:B1');
  
  // Add empty row
  worksheet.addRow([]);

  // Booking Reference
  if (summaryData.bookingReference) {
    const refRow = worksheet.addRow(['Booking Reference', summaryData.bookingReference]);
    refRow.font = { bold: true };
    refRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };
  }

  // Add empty row
  worksheet.addRow([]);

  // Patient Information Section
  const patientHeaderRow = worksheet.addRow(['PATIENT INFORMATION', '']);
  patientHeaderRow.font = { size: 12, bold: true };
  patientHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  patientHeaderRow.font = { ...patientHeaderRow.font, color: { argb: 'FFFFFFFF' } };
  worksheet.mergeCells(`A${patientHeaderRow.number}:B${patientHeaderRow.number}`);

  worksheet.addRow(['Patient Name', summaryData.patient.name]);
  worksheet.addRow(['Phone Number', summaryData.patient.phone]);
  worksheet.addRow(['Email', summaryData.patient.email]);
  
  if (summaryData.patient.age) {
    worksheet.addRow(['Age', `${summaryData.patient.age} years`]);
  }
  
  if (summaryData.patient.gender && summaryData.patient.gender !== 'N/A') {
    worksheet.addRow(['Gender', summaryData.patient.gender]);
  }

  // Add empty row
  worksheet.addRow([]);

  // Appointment Details Section
  const appointmentHeaderRow = worksheet.addRow(['APPOINTMENT DETAILS', '']);
  appointmentHeaderRow.font = { size: 12, bold: true };
  appointmentHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  appointmentHeaderRow.font = { ...appointmentHeaderRow.font, color: { argb: 'FFFFFFFF' } };
  worksheet.mergeCells(`A${appointmentHeaderRow.number}:B${appointmentHeaderRow.number}`);

  worksheet.addRow(['Dentist', summaryData.dentist.name]);
  
  const appointmentDate = new Date(summaryData.appointmentDate);
  worksheet.addRow(['Appointment Date', appointmentDate.toLocaleDateString('en-US', { dateStyle: 'full' })]);
  worksheet.addRow(['Appointment Time', appointmentDate.toLocaleTimeString('en-US', { timeStyle: 'short' })]);
  worksheet.addRow(['Appointment Type', summaryData.appointmentType]);
  worksheet.addRow(['Status', summaryData.status]);

  // Add empty row
  worksheet.addRow([]);

  // Symptoms Section
  const symptomsHeaderRow = worksheet.addRow(['SYMPTOMS / CHIEF COMPLAINT', '']);
  symptomsHeaderRow.font = { size: 12, bold: true };
  symptomsHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  symptomsHeaderRow.font = { ...symptomsHeaderRow.font, color: { argb: 'FFFFFFFF' } };
  worksheet.mergeCells(`A${symptomsHeaderRow.number}:B${symptomsHeaderRow.number}`);

  const symptomsRow = worksheet.addRow(['Symptoms', summaryData.chiefComplaint]);
  symptomsRow.alignment = { wrapText: true, vertical: 'top' };

  // Uncertainty Note (if applicable)
  if (!summaryData.causeIdentified && summaryData.uncertaintyNote) {
    const uncertaintyRow = worksheet.addRow(['⚠ Important Note', summaryData.uncertaintyNote]);
    uncertaintyRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF3CD' } // Light yellow
    };
    uncertaintyRow.font = { bold: true, color: { argb: 'FFB8860B' } }; // Dark golden
    uncertaintyRow.alignment = { wrapText: true, vertical: 'top' };
    
    const noteRow = worksheet.addRow(['', 'The dentist will help identify the cause during the appointment.']);
    noteRow.font = { italic: true };
    noteRow.alignment = { wrapText: true };
  }

  // Medical History (if provided)
  if (summaryData.medicalHistory) {
    worksheet.addRow([]);
    const historyHeaderRow = worksheet.addRow(['MEDICAL HISTORY', '']);
    historyHeaderRow.font = { size: 12, bold: true };
    historyHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    historyHeaderRow.font = { ...historyHeaderRow.font, color: { argb: 'FFFFFFFF' } };
    worksheet.mergeCells(`A${historyHeaderRow.number}:B${historyHeaderRow.number}`);

    const historyRow = worksheet.addRow(['Medical History', summaryData.medicalHistory]);
    historyRow.alignment = { wrapText: true, vertical: 'top' };
  }

  // Documents Section
  if (summaryData.documents && summaryData.documents.length > 0) {
    worksheet.addRow([]);
    const docsHeaderRow = worksheet.addRow(['UPLOADED DOCUMENTS', '']);
    docsHeaderRow.font = { size: 12, bold: true };
    docsHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    docsHeaderRow.font = { ...docsHeaderRow.font, color: { argb: 'FFFFFFFF' } };
    worksheet.mergeCells(`A${docsHeaderRow.number}:B${docsHeaderRow.number}`);

    summaryData.documents.forEach((doc: any, index: number) => {
      const fileSize = doc.fileSize ? `(${(doc.fileSize / 1024).toFixed(2)} KB)` : '';
      const docRow = worksheet.addRow([
        `Document ${index + 1}`,
        `${doc.fileName} ${fileSize} - ${doc.fileType || 'Unknown type'}`
      ]);
      docRow.alignment = { wrapText: true };
    });
  }

  // Add footer
  worksheet.addRow([]);
  const footerRow = worksheet.addRow(['Generated on', new Date().toLocaleString()]);
  footerRow.font = { italic: true, size: 9 };
  footerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF0F0F0' }
  };

  // Apply borders to all cells with content
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) { // Skip title row
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
        };
      });
    }
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

serve(async (req) => {
  // Generate request ID for tracking
  const requestId = crypto.randomUUID();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user authentication
    const user = await verifyJWT(req, supabase);
    logRequest(req, user.id, { requestId, function: 'generate-booking-summary' });

    // Check rate limit (20 requests per minute per user for document generation)
    const rateLimitCheck = checkRateLimit(getClientIdentifier(req, user.id), {
      maxRequests: 20,
      windowMs: 60000
    });

    if (rateLimitCheck.limited) {
      logError('Rate limit exceeded', { userId: user.id, requestId });
      return createRateLimitResponse(rateLimitCheck.resetTime);
    }

    // Validate and parse request body
    const rawBody = await validateRequestBody(req);
    validateRequiredFields(rawBody, ['appointmentId']);

    // Sanitize input
    const { appointmentId, format, generatePdf, generateExcel: shouldGenerateExcel } = sanitizeObject(rawBody);

    // Validate appointmentId
    if (!isValidUUID(appointmentId)) {
      throw new Error('Invalid appointmentId format');
    }

    // Default to generating PDF if not specified
    const shouldGeneratePdf = generatePdf !== false;
    // Generate Excel if explicitly requested
    const generateExcelFile = shouldGenerateExcel === true;

    // Fetch appointment data
    const { appointment, documents } = await fetchAppointmentData(supabase, appointmentId);

    // Verify user has access to this appointment
    const isPatient = appointment.patient_id === user.id;
    const isDentist = appointment.dentist_id === user.id;
    
    // Check if user is admin
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const isAdmin = userRoles?.some((r: any) => r.role === 'admin');

    if (!isPatient && !isDentist && !isAdmin) {
      throw new Error('Unauthorized: You do not have access to this appointment');
    }

    // Calculate patient age
    const patientAge = calculateAge(appointment.patient?.date_of_birth);

    // Prepare appointment summary data
    const summaryData = {
      appointmentId: appointment.id,
      bookingReference: appointment.booking_reference,
      
      // Patient information
      patient: {
        name: appointment.patient?.full_name || 'N/A',
        email: appointment.patient?.email || 'N/A',
        phone: appointment.patient?.phone || 'N/A',
        age: patientAge,
        gender: appointment.patient?.gender || 'N/A',
        dateOfBirth: appointment.patient?.date_of_birth
      },
      
      // Dentist information
      dentist: {
        name: appointment.dentist?.full_name || 'N/A',
        email: appointment.dentist?.email || 'N/A',
        phone: appointment.dentist?.phone || 'N/A'
      },
      
      // Appointment details
      appointmentDate: appointment.appointment_date,
      appointmentType: appointment.appointment_type || 'General Consultation',
      status: appointment.status,
      
      // Medical information
      symptoms: appointment.symptoms || 'N/A',
      chiefComplaint: appointment.chief_complaint || appointment.symptoms || 'N/A',
      causeIdentified: appointment.cause_identified ?? true,
      uncertaintyNote: appointment.uncertainty_note,
      medicalHistory: appointment.medical_history,
      patientNotes: appointment.patient_notes,
      
      // Documents
      documents: documents.map((doc: any) => ({
        id: doc.id,
        fileName: doc.file_name,
        fileUrl: doc.file_url,
        fileType: doc.file_type,
        fileSize: doc.file_size,
        uploadedAt: doc.created_at
      })),
      
      // Metadata
      createdAt: appointment.created_at,
      updatedAt: appointment.updated_at,
      conversationId: appointment.conversation_id
    };

    console.log('Appointment summary data prepared successfully');

    // Generate PDF if requested
    let pdfUrl = null;
    if (shouldGeneratePdf) {
      try {
        console.log('Generating PDF...');
        const pdfBuffer = generatePDF(summaryData);
        
        // Delete old PDF if it exists
        if (appointment.booking_summary_url) {
          await deleteOldDocument(supabase, appointment.booking_summary_url);
        }
        
        // Generate unique filename with booking reference
        const filename = `booking-summary-${summaryData.bookingReference || appointmentId}-${Date.now()}.pdf`;
        
        // Upload PDF to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('appointment-documents')
          .upload(filename, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading PDF:', uploadError);
          throw new Error(`Failed to upload PDF: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('appointment-documents')
          .getPublicUrl(filename);

        pdfUrl = urlData.publicUrl;
        console.log('PDF generated and uploaded successfully:', pdfUrl);

        // Update appointment with PDF URL
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ booking_summary_url: pdfUrl })
          .eq('id', appointmentId);

        if (updateError) {
          console.error('Error updating appointment with PDF URL:', updateError);
          // Don't throw - PDF was generated successfully
        }
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError);
        // Don't throw - return summary data without PDF
      }
    }

    // Generate Excel if requested
    let excelUrl = null;
    if (generateExcelFile) {
      try {
        console.log('Generating Excel...');
        const excelBuffer = await generateExcel(summaryData);
        
        // Delete old Excel if it exists
        if (appointment.excel_sheet_url) {
          await deleteOldDocument(supabase, appointment.excel_sheet_url);
        }
        
        // Generate unique filename with dentist ID and date
        const dentistId = appointment.dentist_id;
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `appointment-sheet-${dentistId}-${dateStr}-${summaryData.bookingReference || appointmentId}.xlsx`;
        
        // Upload Excel to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('appointment-documents')
          .upload(filename, excelBuffer, {
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading Excel:', uploadError);
          throw new Error(`Failed to upload Excel: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('appointment-documents')
          .getPublicUrl(filename);

        excelUrl = urlData.publicUrl;
        console.log('Excel generated and uploaded successfully:', excelUrl);

        // Update appointment with Excel URL
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ excel_sheet_url: excelUrl })
          .eq('id', appointmentId);

        if (updateError) {
          console.error('Error updating appointment with Excel URL:', updateError);
          // Don't throw - Excel was generated successfully
        }
      } catch (excelError) {
        console.error('Error generating Excel:', excelError);
        // Don't throw - return summary data without Excel
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: summaryData,
        pdfUrl: pdfUrl,
        excelUrl: excelUrl
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { requestId, function: 'generate-booking-summary' });
    
    // Determine appropriate status code
    let status = 500;
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized') || error.message.includes('access')) {
        status = 403;
      } else if (error.message.includes('authorization') || error.message.includes('Authentication')) {
        status = 401;
      } else if (error.message.includes('Missing required fields') || error.message.includes('Invalid')) {
        status = 400;
      } else if (error.message.includes('not found')) {
        status = 404;
      }
    }

    return createErrorResponse(error instanceof Error ? error : new Error(String(error)), status, requestId);
  }
});
