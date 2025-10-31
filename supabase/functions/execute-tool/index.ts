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
    const { toolName, arguments: toolArgs, userId } = await req.json();
    
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

    let result;

    switch (toolName) {
      case 'get_dentists': {
        const query = supabaseClient
          .from('dentists')
          .select(`
            id,
            specialization,
            bio,
            years_of_experience,
            rating,
            profiles!inner(full_name, email)
          `);

        if (toolArgs.specialization) {
          query.ilike('specialization', `%${toolArgs.specialization}%`);
        }

        const { data, error } = await query;
        
        if (error) throw error;
        
        result = {
          dentists: (data as any[]).map((d: any) => ({
            id: d.id,
            name: d.profiles.full_name,
            specialization: d.specialization,
            bio: d.bio,
            experience: d.years_of_experience,
            rating: d.rating
          }))
        };
        break;
      }

      case 'get_availability': {
        const { data, error } = await supabaseClient
          .from('dentist_availability')
          .select('*')
          .eq('dentist_id', toolArgs.dentist_id)
          .eq('is_available', true);

        if (error) throw error;

        const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        result = {
          availability: data.map(slot => ({
            day: dayMap[slot.day_of_week],
            start_time: slot.start_time,
            end_time: slot.end_time
          }))
        };
        break;
      }

      case 'book_appointment': {
        const { data: appointmentData, error: appointmentError } = await supabaseClient
          .from('appointments')
          .insert({
            patient_id: userId,
            dentist_id: toolArgs.dentist_id,
            appointment_date: toolArgs.appointment_date,
            appointment_type: toolArgs.appointment_type,
            symptoms: toolArgs.symptoms,
            cause_identified: toolArgs.cause_identified ?? true,
            uncertainty_note: toolArgs.uncertainty_note || null,
            chief_complaint: toolArgs.symptoms,
            recommended_by_ai: true,
            status: 'upcoming'
          })
          .select()
          .single();

        if (appointmentError) throw appointmentError;

        // Fetch patient and dentist info for confirmation
        const { data: patientData } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        const { data: dentistData } = await supabaseClient
          .from('dentists')
          .select(`
            *,
            profiles!inner(full_name, email)
          `)
          .eq('id', toolArgs.dentist_id)
          .single();

        result = {
          success: true,
          appointment: {
            id: appointmentData.id,
            date: appointmentData.appointment_date,
            type: appointmentData.appointment_type,
            patient: patientData?.full_name,
            dentist: dentistData?.profiles?.full_name,
            symptoms: appointmentData.symptoms
          }
        };
        break;
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("execute-tool error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
