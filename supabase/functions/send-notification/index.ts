import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  type: 'booking_confirmation' | 'new_booking_alert' | 'cancellation_notification';
  appointmentId: string;
  recipientId?: string;
}

interface AppointmentData {
  id: string;
  patient_id: string;
  dentist_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  symptoms?: string;
  booking_reference?: string;
  cancellation_reason?: string;
  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;
}

interface DentistData {
  id: string;
  name: string;
  email: string;
  specialization?: string;
}

interface PatientData {
  id: string;
  email: string;
  full_name?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { type, appointmentId, recipientId }: NotificationRequest = await req.json();

    if (!type || !appointmentId) {
      throw new Error('Missing required fields: type and appointmentId');
    }

    // Fetch appointment data
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      throw new Error('Appointment not found');
    }

    const appointmentData = appointment as AppointmentData;

    // Fetch dentist data
    const { data: dentist, error: dentistError } = await supabase
      .from('dentists')
      .select('id, name, email, specialization')
      .eq('id', appointmentData.dentist_id)
      .single();

    if (dentistError || !dentist) {
      throw new Error('Dentist not found');
    }

    const dentistData = dentist as DentistData;

    // Fetch patient data
    const { data: patient, error: patientError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', appointmentData.patient_id)
      .single();

    const patientData = patient as PatientData;

    let notificationResult;

    switch (type) {
      case 'booking_confirmation':
        notificationResult = await sendBookingConfirmation(
          supabase,
          appointmentData,
          dentistData,
          patientData
        );
        break;

      case 'new_booking_alert':
        notificationResult = await sendNewBookingAlert(
          supabase,
          appointmentData,
          dentistData,
          patientData
        );
        break;

      case 'cancellation_notification':
        notificationResult = await sendCancellationNotification(
          supabase,
          appointmentData,
          dentistData,
          patientData
        );
        break;

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification sent successfully',
        result: notificationResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

/**
 * Send booking confirmation to patient
 */
async function sendBookingConfirmation(
  supabase: any,
  appointment: AppointmentData,
  dentist: DentistData,
  patient: PatientData
): Promise<any> {
  const appointmentDate = new Date(appointment.appointment_date);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const emailContent = `
    <h2>Appointment Confirmation</h2>
    <p>Dear ${patient.full_name || 'Patient'},</p>
    <p>Your appointment has been successfully booked!</p>
    
    <h3>Appointment Details:</h3>
    <ul>
      <li><strong>Dentist:</strong> ${dentist.name}</li>
      <li><strong>Specialization:</strong> ${dentist.specialization || 'General Dentistry'}</li>
      <li><strong>Date:</strong> ${formattedDate}</li>
      <li><strong>Time:</strong> ${appointment.appointment_time}</li>
      <li><strong>Booking Reference:</strong> ${appointment.booking_reference || 'N/A'}</li>
      <li><strong>Status:</strong> ${appointment.status}</li>
    </ul>
    
    ${appointment.symptoms ? `<p><strong>Reason for Visit:</strong> ${appointment.symptoms}</p>` : ''}
    
    <h3>Cancellation Policy:</h3>
    <p>You can cancel your appointment up to 1 hour before the scheduled time. 
    Cancellations within 1 hour of the appointment are not permitted.</p>
    
    <p>To view or manage your appointment, please visit your dashboard.</p>
    
    <p>If you have any questions, please contact us.</p>
    
    <p>Best regards,<br>Dental Appointment System</p>
  `;

  // Create in-app notification
  const { data: notification, error: notificationError } = await supabase
    .from('notifications')
    .insert({
      user_id: appointment.patient_id,
      type: 'booking_confirmation',
      title: 'Appointment Confirmed',
      message: `Your appointment with ${dentist.name} on ${formattedDate} at ${appointment.appointment_time} has been confirmed.`,
      data: {
        appointment_id: appointment.id,
        dentist_name: dentist.name,
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time
      },
      read: false
    })
    .select()
    .single();

  if (notificationError) {
    console.error('Error creating notification:', notificationError);
  }

  return {
    notification_id: notification?.id,
    recipient: patient.email,
    type: 'booking_confirmation'
  };
}

/**
 * Send new booking alert to dentist
 */
async function sendNewBookingAlert(
  supabase: any,
  appointment: AppointmentData,
  dentist: DentistData,
  patient: PatientData
): Promise<any> {
  const appointmentDate = new Date(appointment.appointment_date);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const emailContent = `
    <h2>New Appointment Booking</h2>
    <p>Dear Dr. ${dentist.name},</p>
    <p>You have received a new appointment booking!</p>
    
    <h3>Patient Information:</h3>
    <ul>
      <li><strong>Name:</strong> ${appointment.patient_name || patient.full_name || 'N/A'}</li>
      <li><strong>Email:</strong> ${appointment.patient_email || patient.email}</li>
      <li><strong>Phone:</strong> ${appointment.patient_phone || 'N/A'}</li>
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
    
    <p>Please review the full booking details in your dentist dashboard.</p>
    
    <p>Best regards,<br>Dental Appointment System</p>
  `;

  // Create in-app notification for dentist
  const { data: notification, error: notificationError } = await supabase
    .from('notifications')
    .insert({
      user_id: dentist.id,
      type: 'new_booking',
      title: 'New Appointment Booking',
      message: `New appointment from ${appointment.patient_name || patient.full_name || 'a patient'} on ${formattedDate} at ${appointment.appointment_time}.`,
      data: {
        appointment_id: appointment.id,
        patient_name: appointment.patient_name || patient.full_name,
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time
      },
      read: false
    })
    .select()
    .single();

  if (notificationError) {
    console.error('Error creating notification:', notificationError);
  }

  return {
    notification_id: notification?.id,
    recipient: dentist.email,
    type: 'new_booking_alert'
  };
}

/**
 * Send cancellation notification to both patient and dentist
 */
async function sendCancellationNotification(
  supabase: any,
  appointment: AppointmentData,
  dentist: DentistData,
  patient: PatientData
): Promise<any> {
  const appointmentDate = new Date(appointment.appointment_date);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Notification for patient
  const patientEmailContent = `
    <h2>Appointment Cancelled</h2>
    <p>Dear ${patient.full_name || 'Patient'},</p>
    <p>Your appointment has been cancelled.</p>
    
    <h3>Cancelled Appointment Details:</h3>
    <ul>
      <li><strong>Dentist:</strong> ${dentist.name}</li>
      <li><strong>Date:</strong> ${formattedDate}</li>
      <li><strong>Time:</strong> ${appointment.appointment_time}</li>
      <li><strong>Booking Reference:</strong> ${appointment.booking_reference || 'N/A'}</li>
    </ul>
    
    ${appointment.cancellation_reason ? `<p><strong>Cancellation Reason:</strong> ${appointment.cancellation_reason}</p>` : ''}
    
    <p>If you would like to book another appointment, please visit our website.</p>
    
    <p>Best regards,<br>Dental Appointment System</p>
  `;

  // Notification for dentist
  const dentistEmailContent = `
    <h2>Appointment Cancelled</h2>
    <p>Dear Dr. ${dentist.name},</p>
    <p>An appointment has been cancelled.</p>
    
    <h3>Cancelled Appointment Details:</h3>
    <ul>
      <li><strong>Patient:</strong> ${appointment.patient_name || patient.full_name || 'N/A'}</li>
      <li><strong>Date:</strong> ${formattedDate}</li>
      <li><strong>Time:</strong> ${appointment.appointment_time}</li>
      <li><strong>Booking Reference:</strong> ${appointment.booking_reference || 'N/A'}</li>
    </ul>
    
    ${appointment.cancellation_reason ? `<p><strong>Cancellation Reason:</strong> ${appointment.cancellation_reason}</p>` : ''}
    
    <p>The time slot is now available for other bookings.</p>
    
    <p>Best regards,<br>Dental Appointment System</p>
  `;

  // Create in-app notification for patient
  const { data: patientNotification, error: patientNotificationError } = await supabase
    .from('notifications')
    .insert({
      user_id: appointment.patient_id,
      type: 'appointment_cancelled',
      title: 'Appointment Cancelled',
      message: `Your appointment with ${dentist.name} on ${formattedDate} at ${appointment.appointment_time} has been cancelled.`,
      data: {
        appointment_id: appointment.id,
        dentist_name: dentist.name,
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        cancellation_reason: appointment.cancellation_reason
      },
      read: false
    })
    .select()
    .single();

  if (patientNotificationError) {
    console.error('Error creating patient notification:', patientNotificationError);
  }

  // Create in-app notification for dentist
  const { data: dentistNotification, error: dentistNotificationError } = await supabase
    .from('notifications')
    .insert({
      user_id: dentist.id,
      type: 'appointment_cancelled',
      title: 'Appointment Cancelled',
      message: `Appointment with ${appointment.patient_name || patient.full_name || 'a patient'} on ${formattedDate} at ${appointment.appointment_time} has been cancelled.`,
      data: {
        appointment_id: appointment.id,
        patient_name: appointment.patient_name || patient.full_name,
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        cancellation_reason: appointment.cancellation_reason
      },
      read: false
    })
    .select()
    .single();

  if (dentistNotificationError) {
    console.error('Error creating dentist notification:', dentistNotificationError);
  }

  return {
    patient_notification_id: patientNotification?.id,
    dentist_notification_id: dentistNotification?.id,
    recipients: [patient.email, dentist.email],
    type: 'cancellation_notification'
  };
}
