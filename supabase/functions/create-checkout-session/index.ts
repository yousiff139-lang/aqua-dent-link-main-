import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

interface CheckoutSessionRequest {
  appointmentId: string;
  amount: number; // Amount in cents
  currency: string;
  dentistName: string;
  patientEmail: string;
  appointmentDate: string;
  appointmentTime: string;
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

    // Verify user authentication
    const user = await verifyJWT(req, supabase);
    logRequest(req, user.id, { requestId, function: 'create-checkout-session' });

    // Check rate limit (10 requests per minute per user)
    const rateLimitCheck = checkRateLimit(getClientIdentifier(req, user.id), {
      maxRequests: 10,
      windowMs: 60000
    });

    if (rateLimitCheck.limited) {
      logError('Rate limit exceeded', { userId: user.id, requestId });
      return createRateLimitResponse(rateLimitCheck.resetTime);
    }

    // Validate and parse request body
    const rawBody = await validateRequestBody(req);
    validateRequiredFields(rawBody, ['appointmentId', 'amount', 'currency', 'dentistName', 'patientEmail', 'appointmentDate', 'appointmentTime']);

    // Sanitize input
    const { appointmentId, amount, currency, dentistName, patientEmail, appointmentDate, appointmentTime } = sanitizeObject(rawBody) as CheckoutSessionRequest;

    // Validate UUID
    if (!isValidUUID(appointmentId)) {
      throw new Error('Invalid appointmentId format');
    }

    // Validate amount (must be positive integer)
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error('Amount must be a positive integer (in cents)');
    }

    // Get Stripe secret key
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE_SECRET_KEY) {
      throw new Error('Stripe secret key not configured');
    }

    // Verify appointment exists and belongs to user
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('patient_id', user.id)
      .single();

    if (appointmentError || !appointment) {
      throw new Error('Appointment not found or access denied');
    }

    // Check if appointment is still pending
    if (appointment.status !== 'pending') {
      throw new Error('Appointment is no longer available for payment');
    }

    // Create Stripe checkout session
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price_data][currency]': currency,
        'line_items[0][price_data][product_data][name]': `Dental Appointment with ${dentistName}`,
        'line_items[0][price_data][product_data][description]': `Appointment on ${appointmentDate} at ${appointmentTime}`,
        'line_items[0][price_data][unit_amount]': amount.toString(),
        'line_items[0][quantity]': '1',
        'mode': 'payment',
        'success_url': `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/payment-cancel?appointment_id=${appointmentId}`,
        'customer_email': patientEmail,
        'metadata[appointment_id]': appointmentId,
        'metadata[patient_id]': user.id,
        'metadata[dentist_name]': dentistName,
        'metadata[appointment_date]': appointmentDate,
        'metadata[appointment_time]': appointmentTime,
      }),
    });

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.text();
      console.error('Stripe API error:', errorData);
      throw new Error('Failed to create checkout session');
    }

    const session = await stripeResponse.json();

    // Update appointment with Stripe session ID
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        stripe_session_id: session.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId);

    if (updateError) {
      console.error('Error updating appointment with session ID:', updateError);
      // Don't throw error here as the session was created successfully
    }

    // Create payment transaction record
    const { error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        appointment_id: appointmentId,
        stripe_session_id: session.id,
        amount: amount,
        currency: currency,
        status: 'pending'
      });

    if (transactionError) {
      console.error('Error creating payment transaction:', transactionError);
      // Don't throw error here as the session was created successfully
    }

    return createSuccessResponse({
      sessionId: session.id,
      url: session.url,
      appointmentId: appointmentId
    });

  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { requestId, function: 'create-checkout-session' });
    
    // Determine appropriate status code
    let status = 500;
    if (error instanceof Error) {
      if (error.message.includes('authorization') || error.message.includes('Authentication')) {
        status = 401;
      } else if (error.message.includes('Invalid') || error.message.includes('not found')) {
        status = 400;
      } else if (error.message.includes('Rate limit')) {
        status = 429;
      }
    }

    return createErrorResponse(error instanceof Error ? error : new Error(String(error)), status, requestId);
  }
});
