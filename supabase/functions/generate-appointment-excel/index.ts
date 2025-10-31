import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointmentId } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Fetch appointment with patient and dentist info
    const { data: appointment, error } = await supabaseClient
      .from('appointments')
      .select(`
        *,
        patient:profiles!appointments_patient_id_fkey(full_name, email, phone),
        dentist:dentists(
          specialization,
          profiles!inner(full_name, email)
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (error) throw error;

    // Generate CSV content (Excel can open CSV files)
    const csvContent = `Appointment Details
Patient Name,${appointment.patient.full_name}
Patient Email,${appointment.patient.email}
Patient Phone,${appointment.patient.phone || 'N/A'}
Dentist Name,${appointment.dentist.profiles.full_name}
Dentist Specialization,${appointment.dentist.specialization}
Appointment Date,${new Date(appointment.appointment_date).toLocaleString()}
Appointment Type,${appointment.appointment_type}
Symptoms,${appointment.symptoms || 'N/A'}
Status,${appointment.status}
Booked via AI,${appointment.recommended_by_ai ? 'Yes' : 'No'}`;

    // Convert to base64 for email attachment
    const encoder = new TextEncoder();
    const data = encoder.encode(csvContent);
    const base64 = btoa(String.fromCharCode(...data));

    return new Response(
      JSON.stringify({
        csvContent,
        base64,
        filename: `appointment_${appointmentId}_${Date.now()}.csv`,
        dentistEmail: appointment.dentist.profiles.email
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("generate-excel error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
