import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import {
  corsHeaders,
  handleCorsPreflightRequest,
  createErrorResponse,
  createSuccessResponse,
  logError
} from '../_shared/security.ts';

interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      payment_status?: string;
      status?: string;
      metadata?: Record<string, string>;
    };
  };
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

    // Get Stripe webhook secret
    const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!STRIPE_WEBHOOK_SECRET) {
      throw new Error('Stripe webhook secret not configured');
    }

    // Get the raw body and signature
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      throw new Error('Missing Stripe signature');
    }

    // Verify webhook signature
    const crypto = await import('https://deno.land/std@0.168.0/crypto/mod.ts');
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(STRIPE_WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const timestamp = signature.split(',')[0].split('=')[1];
    const payload = `${timestamp}.${body}`;
    const expectedSignature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const receivedSignature = signature.split(',')[1].split('=')[1];
    if (expectedSignatureHex !== receivedSignature) {
      throw new Error('Invalid Stripe signature');
    }

    // Parse the webhook event
    const event: StripeWebhookEvent = JSON.parse(body);

    console.log('Received Stripe webhook:', event.type, event.id);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(supabase, event);
        break;
      
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(supabase, event);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(supabase, event);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return createSuccessResponse({ received: true });

  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { requestId, function: 'stripe-webhook' });
    
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)), 400, requestId);
  }
});

async function handleCheckoutSessionCompleted(supabase: any, event: StripeWebhookEvent) {
  const session = event.data.object;
  const appointmentId = session.metadata?.appointment_id;

  if (!appointmentId) {
    console.error('No appointment_id in session metadata');
    return;
  }

  console.log('Processing checkout session completed for appointment:', appointmentId);

  // Update appointment status
  const { error: appointmentError } = await supabase
    .from('appointments')
    .update({
      status: 'confirmed',
      payment_status: 'paid',
      stripe_payment_intent_id: session.payment_intent,
      updated_at: new Date().toISOString()
    })
    .eq('id', appointmentId);

  if (appointmentError) {
    console.error('Error updating appointment:', appointmentError);
    throw new Error('Failed to update appointment status');
  }

  // Update payment transaction
  const { error: transactionError } = await supabase
    .from('payment_transactions')
    .update({
      status: 'succeeded',
      stripe_webhook_data: event,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_session_id', session.id);

  if (transactionError) {
    console.error('Error updating payment transaction:', transactionError);
  }

  // Trigger PDF generation
  try {
    const { data: appointment } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (appointment) {
      // Call PDF generation function
      const { error: pdfError } = await supabase.functions.invoke('generate-appointment-pdf', {
        body: { appointmentId }
      });

      if (pdfError) {
        console.error('Error generating PDF:', pdfError);
      } else {
        console.log('PDF generation triggered successfully');
      }
    }
  } catch (error) {
    console.error('Error triggering PDF generation:', error);
  }

  console.log('Checkout session completed successfully for appointment:', appointmentId);
}

async function handlePaymentIntentSucceeded(supabase: any, event: StripeWebhookEvent) {
  const paymentIntent = event.data.object;
  console.log('Payment intent succeeded:', paymentIntent.id);

  // Update payment transaction if exists
  const { error: transactionError } = await supabase
    .from('payment_transactions')
    .update({
      status: 'succeeded',
      stripe_webhook_data: event,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (transactionError) {
    console.error('Error updating payment transaction:', transactionError);
  }
}

async function handlePaymentIntentFailed(supabase: any, event: StripeWebhookEvent) {
  const paymentIntent = event.data.object;
  console.log('Payment intent failed:', paymentIntent.id);

  // Update payment transaction
  const { error: transactionError } = await supabase
    .from('payment_transactions')
    .update({
      status: 'failed',
      stripe_webhook_data: event,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (transactionError) {
    console.error('Error updating payment transaction:', transactionError);
  }

  // Update appointment status
  const { error: appointmentError } = await supabase
    .from('appointments')
    .update({
      payment_status: 'pending',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (appointmentError) {
    console.error('Error updating appointment payment status:', appointmentError);
  }
}
