import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { PDFDocument, rgb, StandardFonts } from 'https://cdn.skypack.dev/pdf-lib@^1.17.1';

import {
  corsHeaders,
  handleCorsPreflightRequest,
  verifyJWT,
  sanitizeObject,
  isValidUUID,
  createErrorResponse,
  createSuccessResponse,
  validateRequestBody,
  validateRequiredFields,
  logRequest,
  logError
} from '../_shared/security.ts';

interface PDFGenerationRequest {
  appointmentId: string;
}

serve(async (req) => {
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

    // Verify user authentication (optional for internal calls)
    try {
      const user = await verifyJWT(req, supabase);
      logRequest(req, user.id, { requestId, function: 'generate-appointment-pdf' });
    } catch (error) {
      // Allow internal calls without authentication
      console.log('Internal PDF generation call');
    }

    // Validate and parse request body
    const rawBody = await validateRequestBody(req);
    validateRequiredFields(rawBody, ['appointmentId']);

    // Sanitize input
    const { appointmentId } = sanitizeObject(rawBody) as PDFGenerationRequest;

    // Validate UUID
    if (!isValidUUID(appointmentId)) {
      throw new Error('Invalid appointmentId format');
    }

    // Get appointment data with related information
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        dentists!appointments_dentist_id_fkey (
          name,
          email,
          specialization,
          phone,
          address
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      throw new Error('Appointment not found');
    }

    // Get medical documents
    const { data: medicalDocuments } = await supabase
      .from('medical_documents')
      .select('*')
      .eq('appointment_id', appointmentId);

    // Generate PDF
    const pdfBytes = await generateAppointmentPDF(appointment, medicalDocuments || []);

    // Upload PDF to storage
    const fileName = `appointment-${appointmentId}-${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('appointment-pdfs')
      .upload(`${appointment.patient_id}/${fileName}`, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
      throw new Error('Failed to upload PDF');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('appointment-pdfs')
      .getPublicUrl(`${appointment.patient_id}/${fileName}`);

    // Update appointment with PDF URL
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        pdf_report_url: urlData.publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId);

    if (updateError) {
      console.error('Error updating appointment with PDF URL:', updateError);
    }

    // Trigger email notifications to dentist and admins
    try {
      const notificationResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-appointment-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({
            appointmentId: appointmentId,
            pdfUrl: urlData.publicUrl
          })
        }
      );

      if (notificationResponse.ok) {
        console.log('Email notifications sent successfully');
      } else {
        console.error('Failed to send email notifications:', await notificationResponse.text());
      }
    } catch (notificationError) {
      console.error('Error sending email notifications:', notificationError);
      // Don't fail the PDF generation if notifications fail
    }

    return createSuccessResponse({
      pdfUrl: urlData.publicUrl,
      fileName: fileName,
      appointmentId: appointmentId
    });

  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { requestId, function: 'generate-appointment-pdf' });
    
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)), 500, requestId);
  }
});

async function generateAppointmentPDF(appointment: any, medicalDocuments: any[]): Promise<Uint8Array> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const { width, height } = page.getSize();

  // Load fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let yPosition = height - 50;

  // Helper function to add text
  const addText = (text: string, x: number, y: number, fontSize: number = 12, isBold: boolean = false) => {
    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font: isBold ? boldFont : font,
      color: rgb(0, 0, 0),
    });
  };

  // Helper function to add line
  const addLine = (y: number) => {
    page.drawLine({
      start: { x: 50, y },
      end: { x: width - 50, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
  };

  // Header
  addText('DENTAL APPOINTMENT REPORT', width / 2 - 100, yPosition, 18, true);
  yPosition -= 30;

  addLine(yPosition);
  yPosition -= 20;

  // Appointment Information
  addText('APPOINTMENT INFORMATION', 50, yPosition, 14, true);
  yPosition -= 25;

  addText(`Appointment ID: ${appointment.id}`, 50, yPosition);
  yPosition -= 20;
  addText(`Date: ${appointment.appointment_date}`, 50, yPosition);
  yPosition -= 20;
  addText(`Time: ${appointment.appointment_time}`, 50, yPosition);
  yPosition -= 20;
  addText(`Status: ${appointment.status.toUpperCase()}`, 50, yPosition);
  yPosition -= 20;
  addText(`Payment Method: ${appointment.payment_method.toUpperCase()}`, 50, yPosition);
  yPosition -= 20;
  addText(`Payment Status: ${appointment.payment_status.toUpperCase()}`, 50, yPosition);
  yPosition -= 30;

  addLine(yPosition);
  yPosition -= 20;

  // Patient Information
  addText('PATIENT INFORMATION', 50, yPosition, 14, true);
  yPosition -= 25;

  addText(`Name: ${appointment.patient_name}`, 50, yPosition);
  yPosition -= 20;
  addText(`Email: ${appointment.patient_email}`, 50, yPosition);
  yPosition -= 20;
  addText(`Phone: ${appointment.patient_phone}`, 50, yPosition);
  yPosition -= 30;

  addLine(yPosition);
  yPosition -= 20;

  // Dentist Information
  addText('DENTIST INFORMATION', 50, yPosition, 14, true);
  yPosition -= 25;

  if (appointment.dentists) {
    addText(`Name: ${appointment.dentists.name}`, 50, yPosition);
    yPosition -= 20;
    addText(`Specialization: ${appointment.dentists.specialization}`, 50, yPosition);
    yPosition -= 20;
    addText(`Email: ${appointment.dentists.email}`, 50, yPosition);
    yPosition -= 20;
    addText(`Phone: ${appointment.dentists.phone}`, 50, yPosition);
    yPosition -= 20;
    addText(`Address: ${appointment.dentists.address}`, 50, yPosition);
    yPosition -= 30;
  }

  addLine(yPosition);
  yPosition -= 20;

  // Medical Information
  addText('MEDICAL INFORMATION', 50, yPosition, 14, true);
  yPosition -= 25;

  if (appointment.chief_complaint) {
    addText(`Chief Complaint: ${appointment.chief_complaint}`, 50, yPosition);
    yPosition -= 20;
  }

  if (appointment.symptoms) {
    addText(`Symptoms: ${appointment.symptoms}`, 50, yPosition);
    yPosition -= 20;
  }

  if (appointment.medical_history) {
    addText(`Medical History: ${appointment.medical_history}`, 50, yPosition);
    yPosition -= 20;
  }

  addText(`Smoking: ${appointment.smoking ? 'Yes' : 'No'}`, 50, yPosition);
  yPosition -= 20;

  if (appointment.medications) {
    addText(`Current Medications: ${appointment.medications}`, 50, yPosition);
    yPosition -= 20;
  }

  if (appointment.allergies) {
    addText(`Allergies: ${appointment.allergies}`, 50, yPosition);
    yPosition -= 20;
  }

  if (appointment.previous_dental_work) {
    addText(`Previous Dental Work: ${appointment.previous_dental_work}`, 50, yPosition);
    yPosition -= 20;
  }

  addText(`Cause Identified: ${appointment.cause_identified ? 'Yes' : 'No'}`, 50, yPosition);
  yPosition -= 20;

  if (appointment.uncertainty_note) {
    addText(`Uncertainty Note: ${appointment.uncertainty_note}`, 50, yPosition);
    yPosition -= 20;
  }

  yPosition -= 20;

  addLine(yPosition);
  yPosition -= 20;

  // Medical Documents
  if (medicalDocuments.length > 0) {
    addText('MEDICAL DOCUMENTS', 50, yPosition, 14, true);
    yPosition -= 25;

    medicalDocuments.forEach((doc, index) => {
      addText(`${index + 1}. ${doc.file_name}`, 50, yPosition);
      yPosition -= 20;
      if (doc.description) {
        addText(`   Description: ${doc.description}`, 50, yPosition);
        yPosition -= 20;
      }
    });

    yPosition -= 20;
    addLine(yPosition);
    yPosition -= 20;
  }

  // Notes
  if (appointment.patient_notes || appointment.dentist_notes) {
    addText('NOTES', 50, yPosition, 14, true);
    yPosition -= 25;

    if (appointment.patient_notes) {
      addText(`Patient Notes: ${appointment.patient_notes}`, 50, yPosition);
      yPosition -= 20;
    }

    if (appointment.dentist_notes) {
      addText(`Dentist Notes: ${appointment.dentist_notes}`, 50, yPosition);
      yPosition -= 20;
    }

    yPosition -= 20;
    addLine(yPosition);
    yPosition -= 20;
  }

  // Footer
  const currentDate = new Date().toLocaleDateString();
  addText(`Report generated on: ${currentDate}`, 50, 50);
  addText('Aqua Dent Link - Dental Appointment System', width - 200, 50);

  // Return PDF bytes
  return await pdfDoc.save();
}
