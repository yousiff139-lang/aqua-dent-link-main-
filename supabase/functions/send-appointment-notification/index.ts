import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

interface NotificationRequest {
  appointmentId: string;
  pdfUrl: string;
}

interface AppointmentData {
  id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  dentist_id: string;
  appointment_date: string;
  appointment_time: string;
  symptoms: string;
  chief_complaint: string;
  medical_history: string;
  smoking: boolean;
  medications: string;
  allergies: string;
  previous_dental_work: string;
  cause_identified: boolean;
  uncertainty_note: string;
  booking_reference: string;
  status: string;
  payment_method: string;
  payment_status: string;
  pdf_report_url: string;
}

interface DentistData {
  id: string;
  name: string;
  email: string;
  specialization: string;
}

interface AdminData {
  id: string;
  email: string;
  full_name: string;
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
      logRequest(req, user.id, { requestId, function: 'send-appointment-notification' });
    } catch (error) {
      // Allow internal calls without authentication
      console.log('Internal notification call');
    }

    // Validate and parse request body
    const rawBody = await validateRequestBody(req);
    validateRequiredFields(rawBody, ['appointmentId', 'pdfUrl']);

    // Sanitize input
    const { appointmentId, pdfUrl } = sanitizeObject(rawBody) as NotificationRequest;

    // Validate UUID
    if (!isValidUUID(appointmentId)) {
      throw new Error('Invalid appointmentId format');
    }

    // Get appointment data
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      throw new Error('Appointment not found');
    }

    const appointmentData = appointment as AppointmentData;

    // Get dentist data
    const { data: dentist, error: dentistError } = await supabase
      .from('dentists')
      .select('id, name, email, specialization')
      .eq('id', appointmentData.dentist_id)
      .single();

    if (dentistError || !dentist) {
      throw new Error('Dentist not found');
    }

    const dentistData = dentist as DentistData;

    // Get all admin users
    const { data: admins, error: adminsError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        profiles!user_roles_user_id_fkey (
          id,
          email,
          full_name
        )
      `)
      .eq('role', 'admin');

    if (adminsError) {
      console.error('Error fetching admins:', adminsError);
    }

    const adminList = (admins || []).map(admin => ({
      id: admin.user_id,
      email: admin.profiles?.email,
      full_name: admin.profiles?.full_name
    })).filter(admin => admin.email) as AdminData[];

    // Send notifications
    const results = await Promise.allSettled([
      sendDentistNotification(supabase, appointmentData, dentistData, pdfUrl),
      ...adminList.map(admin => sendAdminNotification(supabase, appointmentData, dentistData, admin, pdfUrl))
    ]);

    // Count successful notifications
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    console.log(`Notification results: ${successful} successful, ${failed} failed`);

    return createSuccessResponse({
      message: 'Notifications sent successfully',
      dentistNotified: results[0].status === 'fulfilled',
      adminsNotified: adminList.length,
      successful,
      failed
    });

  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { requestId, function: 'send-appointment-notification' });
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500,
      requestId
    );
  }
});

/**
 * Send notification to dentist
 */
async function sendDentistNotification(
  supabase: any,
  appointment: AppointmentData,
  dentist: DentistData,
  pdfUrl: string
): Promise<void> {
  const appointmentDate = new Date(appointment.appointment_date);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const emailContent = `
    <h2>New Appointment Booking - PDF Report Available</h2>
    <p>Dear Dr. ${dentist.name},</p>
    <p>You have received a new appointment booking with a detailed PDF report.</p>
    
    <h3>Patient Information:</h3>
    <ul>
      <li><strong>Name:</strong> ${appointment.patient_name}</li>
      <li><strong>Email:</strong> ${appointment.patient_email}</li>
      <li><strong>Phone:</strong> ${appointment.patient_phone}</li>
    </ul>
    
    <h3>Appointment Details:</h3>
    <ul>
      <li><strong>Date:</strong> ${formattedDate}</li>
      <li><strong>Time:</strong> ${appointment.appointment_time}</li>
      <li><strong>Booking Reference:</strong> ${appointment.booking_reference || 'N/A'}</li>
      <li><strong>Status:</strong> ${appointment.status}</li>
    </ul>
    
    ${appointment.symptoms ? `<p><strong>Symptoms/Reason:</strong> ${appointment.symptoms}</p>` : ''}
    ${appointment.chief_complaint ? `<p><strong>Chief Complaint:</strong> ${appointment.chief_complaint}</p>` : ''}
    
    <h3>Medical Information:</h3>
    <ul>
      ${appointment.medical_history ? `<li><strong>Medical History:</strong> ${appointment.medical_history}</li>` : ''}
      ${appointment.medications ? `<li><strong>Medications:</strong> ${appointment.medications}</li>` : ''}
      ${appointment.allergies ? `<li><strong>Allergies:</strong> ${appointment.allergies}</li>` : ''}
      <li><strong>Smoking:</strong> ${appointment.smoking ? 'Yes' : 'No'}</li>
      ${appointment.previous_dental_work ? `<li><strong>Previous Dental Work:</strong> ${appointment.previous_dental_work}</li>` : ''}
    </ul>
    
    ${appointment.uncertainty_note ? `<p><strong>Note:</strong> ${appointment.uncertainty_note}</p>` : ''}
    
    <h3>PDF Report:</h3>
    <p>The complete appointment details and medical information are available in the attached PDF report.</p>
    <p><a href="${pdfUrl}" target="_blank" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Download PDF Report</a></p>
    
    <p>Please review the full details in your dentist dashboard.</p>
    
    <p>Best regards,<br>Aqua Dent Link System</p>
  `;

  // Create in-app notification for dentist
  const { error: notificationError } = await supabase
    .from('notifications')
    .insert({
      user_id: dentist.id,
      title: 'New Appointment Booking',
      message: `New appointment with ${appointment.patient_name} on ${formattedDate}`,
      type: 'new_booking_alert',
      data: {
        appointment_id: appointment.id,
        pdf_url: pdfUrl
      }
    });

  if (notificationError) {
    console.error('Error creating dentist notification:', notificationError);
  }

  // Note: In a real implementation, you would send the actual email here
  // For now, we'll just log it
  console.log(`Would send email to dentist ${dentist.email} with PDF: ${pdfUrl}`);
}

/**
 * Send notification to admin
 */
async function sendAdminNotification(
  supabase: any,
  appointment: AppointmentData,
  dentist: DentistData,
  admin: AdminData,
  pdfUrl: string
): Promise<void> {
  const appointmentDate = new Date(appointment.appointment_date);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const emailContent = `
    <h2>New Appointment Booking - Admin Notification</h2>
    <p>Dear ${admin.full_name || 'Admin'},</p>
    <p>A new appointment has been booked in the system.</p>
    
    <h3>Patient Information:</h3>
    <ul>
      <li><strong>Name:</strong> ${appointment.patient_name}</li>
      <li><strong>Email:</strong> ${appointment.patient_email}</li>
      <li><strong>Phone:</strong> ${appointment.patient_phone}</li>
    </ul>
    
    <h3>Dentist Information:</h3>
    <ul>
      <li><strong>Name:</strong> Dr. ${dentist.name}</li>
      <li><strong>Specialization:</strong> ${dentist.specialization}</li>
      <li><strong>Email:</strong> ${dentist.email}</li>
    </ul>
    
    <h3>Appointment Details:</h3>
    <ul>
      <li><strong>Date:</strong> ${formattedDate}</li>
      <li><strong>Time:</strong> ${appointment.appointment_time}</li>
      <li><strong>Booking Reference:</strong> ${appointment.booking_reference || 'N/A'}</li>
      <li><strong>Status:</strong> ${appointment.status}</li>
      <li><strong>Payment Method:</strong> ${appointment.payment_method}</li>
      <li><strong>Payment Status:</strong> ${appointment.payment_status}</li>
    </ul>
    
    ${appointment.symptoms ? `<p><strong>Symptoms/Reason:</strong> ${appointment.symptoms}</p>` : ''}
    ${appointment.chief_complaint ? `<p><strong>Chief Complaint:</strong> ${appointment.chief_complaint}</p>` : ''}
    
    <h3>PDF Report:</h3>
    <p>The complete appointment details are available in the attached PDF report.</p>
    <p><a href="${pdfUrl}" target="_blank" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Download PDF Report</a></p>
    
    <p>You can view all appointments in the admin dashboard.</p>
    
    <p>Best regards,<br>Aqua Dent Link System</p>
  `;

  // Create in-app notification for admin
  const { error: notificationError } = await supabase
    .from('notifications')
    .insert({
      user_id: admin.id,
      title: 'New Appointment Booking',
      message: `New appointment: ${appointment.patient_name} with Dr. ${dentist.name}`,
      type: 'admin_notification',
      data: {
        appointment_id: appointment.id,
        dentist_id: dentist.id,
        pdf_url: pdfUrl
      }
    });

  if (notificationError) {
    console.error('Error creating admin notification:', notificationError);
  }

  // Note: In a real implementation, you would send the actual email here
  // For now, we'll just log it
  console.log(`Would send email to admin ${admin.email} with PDF: ${pdfUrl}`);
}
