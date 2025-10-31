import Stripe from 'stripe';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { appointmentsRepository } from '../repositories/appointments.repository.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import {
  CreateCheckoutSessionParams,
  CheckoutSessionResponse,
  PaymentTransactionStatus,
} from '../types/index.js';
import { AppError } from '../utils/errors.js';

export class PaymentService {
  private stripe: Stripe | null = null;
  private processedEvents: Set<string> = new Set(); // For idempotency

  constructor() {
    // Initialize Stripe only if secret key is provided
    if (env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-09-30.clover',
      });
      logger.info('Stripe initialized successfully');
    } else {
      logger.warn('Stripe secret key not provided - payment features will be disabled');
    }
  }

  /**
   * Create a Stripe Checkout session for appointment payment
   */
  async createCheckoutSession(
    params: CreateCheckoutSessionParams
  ): Promise<CheckoutSessionResponse> {
    try {
      if (!this.stripe) {
        throw AppError.internal('Stripe is not configured');
      }

      // Validate appointment exists
      const appointment = await appointmentsRepository.findById(params.appointmentId);
      if (!appointment) {
        throw AppError.notFound('Appointment not found');
      }

      // Check if appointment already has a successful payment
      if (appointment.payment_status === 'paid') {
        throw AppError.validation('Appointment has already been paid');
      }

      // Determine success and cancel URLs
      const successUrl = env.STRIPE_SUCCESS_URL || 
        `${env.CORS_ORIGIN.split(',')[0]}/booking-confirmation?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = env.STRIPE_CANCEL_URL || 
        `${env.CORS_ORIGIN.split(',')[0]}/booking-cancelled`;

      // Create Stripe Checkout session
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: params.currency,
              product_data: {
                name: `Dental Appointment with ${params.dentistName}`,
                description: `Appointment on ${params.appointmentDate} at ${params.appointmentTime}`,
                metadata: {
                  appointment_id: params.appointmentId,
                  dentist_name: params.dentistName,
                  appointment_date: params.appointmentDate,
                  appointment_time: params.appointmentTime,
                },
              },
              unit_amount: params.amount, // Amount in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: params.patientEmail,
        client_reference_id: params.appointmentId,
        metadata: {
          appointment_id: params.appointmentId,
          patient_name: params.patientName,
          patient_email: params.patientEmail,
          dentist_name: params.dentistName,
          appointment_date: params.appointmentDate,
          appointment_time: params.appointmentTime,
        },
      });

      // Create payment transaction record
      await paymentRepository.create({
        appointment_id: params.appointmentId,
        stripe_session_id: session.id,
        amount: params.amount,
        currency: params.currency,
        status: 'pending',
        payment_method: 'stripe',
        metadata: {
          session_url: session.url,
          customer_email: params.patientEmail,
        },
      });

      // Update appointment with Stripe session ID
      await appointmentsRepository.update(params.appointmentId, {
        payment_status: 'pending',
      });

      logger.info('Stripe Checkout session created', {
        sessionId: session.id,
        appointmentId: params.appointmentId,
        amount: params.amount,
        currency: params.currency,
      });

      return {
        sessionId: session.id,
        url: session.url || '',
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to create Stripe Checkout session', { params, error });
      throw AppError.payment('Failed to create payment session');
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhookEvent(
    payload: string | Buffer,
    signature: string
  ): Promise<void> {
    try {
      if (!this.stripe) {
        throw AppError.internal('Stripe is not configured');
      }

      if (!env.STRIPE_WEBHOOK_SECRET) {
        throw AppError.internal('Stripe webhook secret is not configured');
      }

      // Verify webhook signature
      let event: Stripe.Event;
      try {
        event = this.stripe.webhooks.constructEvent(
          payload,
          signature,
          env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        logger.error('Webhook signature verification failed', { error: err });
        throw AppError.validation('Invalid webhook signature');
      }

      // Implement idempotency - check if event already processed
      if (this.processedEvents.has(event.id)) {
        logger.info('Webhook event already processed', { eventId: event.id });
        return;
      }

      logger.info('Processing Stripe webhook event', {
        eventId: event.id,
        eventType: event.type,
      });

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'checkout.session.expired':
          await this.handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
          break;

        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        default:
          logger.info('Unhandled webhook event type', { eventType: event.type });
      }

      // Mark event as processed
      this.processedEvents.add(event.id);

      // Clean up old processed events (keep last 1000)
      if (this.processedEvents.size > 1000) {
        const eventsArray = Array.from(this.processedEvents);
        this.processedEvents = new Set(eventsArray.slice(-1000));
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to handle webhook event', { error });
      throw AppError.internal('Failed to process webhook event');
    }
  }

  /**
   * Handle successful checkout session completion
   */
  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session
  ): Promise<void> {
    try {
      const appointmentId = session.metadata?.appointment_id || session.client_reference_id;

      if (!appointmentId) {
        logger.error('No appointment ID in checkout session', { sessionId: session.id });
        return;
      }

      // Update payment status to paid
      await this.updatePaymentStatus(appointmentId, 'paid', {
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent as string,
      });

      logger.info('Checkout session completed successfully', {
        sessionId: session.id,
        appointmentId,
        paymentIntentId: session.payment_intent,
      });
    } catch (error) {
      logger.error('Failed to handle checkout session completed', { session, error });
      throw error;
    }
  }

  /**
   * Handle expired checkout session
   */
  private async handleCheckoutSessionExpired(
    session: Stripe.Checkout.Session
  ): Promise<void> {
    try {
      const appointmentId = session.metadata?.appointment_id || session.client_reference_id;

      if (!appointmentId) {
        logger.error('No appointment ID in expired session', { sessionId: session.id });
        return;
      }

      // Update payment status to failed
      await this.updatePaymentStatus(appointmentId, 'failed', {
        stripeSessionId: session.id,
        errorMessage: 'Checkout session expired',
      });

      logger.info('Checkout session expired', {
        sessionId: session.id,
        appointmentId,
      });
    } catch (error) {
      logger.error('Failed to handle checkout session expired', { session, error });
      throw error;
    }
  }

  /**
   * Handle successful payment intent
   */
  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    try {
      const appointmentId = paymentIntent.metadata?.appointment_id;

      if (!appointmentId) {
        logger.warn('No appointment ID in payment intent', {
          paymentIntentId: paymentIntent.id,
        });
        return;
      }

      // Update payment status to paid
      await this.updatePaymentStatus(appointmentId, 'paid', {
        stripePaymentIntentId: paymentIntent.id,
      });

      logger.info('Payment intent succeeded', {
        paymentIntentId: paymentIntent.id,
        appointmentId,
        amount: paymentIntent.amount,
      });
    } catch (error) {
      logger.error('Failed to handle payment intent succeeded', { paymentIntent, error });
      throw error;
    }
  }

  /**
   * Handle failed payment intent
   */
  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    try {
      const appointmentId = paymentIntent.metadata?.appointment_id;

      if (!appointmentId) {
        logger.warn('No appointment ID in failed payment intent', {
          paymentIntentId: paymentIntent.id,
        });
        return;
      }

      const errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed';

      // Update payment status to failed
      await this.updatePaymentStatus(appointmentId, 'failed', {
        stripePaymentIntentId: paymentIntent.id,
        errorMessage,
      });

      logger.info('Payment intent failed', {
        paymentIntentId: paymentIntent.id,
        appointmentId,
        error: errorMessage,
      });
    } catch (error) {
      logger.error('Failed to handle payment intent failed', { paymentIntent, error });
      throw error;
    }
  }

  /**
   * Update payment status for an appointment
   */
  async updatePaymentStatus(
    appointmentId: string,
    status: 'paid' | 'failed',
    details?: {
      stripeSessionId?: string;
      stripePaymentIntentId?: string;
      errorMessage?: string;
    }
  ): Promise<void> {
    try {
      // Update appointment payment status
      await appointmentsRepository.update(appointmentId, {
        payment_status: status,
      });

      // Update payment transaction record
      const payment = await paymentRepository.findByAppointmentId(appointmentId);
      
      if (payment) {
        const transactionStatus: PaymentTransactionStatus = 
          status === 'paid' ? 'succeeded' : 'failed';

        await paymentRepository.updateStatus(payment.id, {
          status: transactionStatus,
          stripe_payment_intent_id: details?.stripePaymentIntentId,
          error_message: details?.errorMessage,
        });
      }

      // Update appointment with Stripe IDs if provided
      if (details?.stripeSessionId || details?.stripePaymentIntentId) {
        const appointment = await appointmentsRepository.findById(appointmentId);
        if (appointment) {
          const updateData: any = {};
          if (details.stripeSessionId && !appointment.stripe_session_id) {
            updateData.stripe_session_id = details.stripeSessionId;
          }
          if (details.stripePaymentIntentId && !appointment.stripe_payment_intent_id) {
            updateData.stripe_payment_intent_id = details.stripePaymentIntentId;
          }
          
          // Only update if there's something to update
          if (Object.keys(updateData).length > 0) {
            // We need to use raw Supabase update since our repository doesn't support these fields
            const { supabase } = await import('../config/supabase.js');
            await supabase
              .from('appointments')
              .update(updateData)
              .eq('id', appointmentId);
          }
        }
      }

      logger.info('Payment status updated', {
        appointmentId,
        status,
        details,
      });
    } catch (error) {
      logger.error('Failed to update payment status', {
        appointmentId,
        status,
        details,
        error,
      });
      throw AppError.internal('Failed to update payment status');
    }
  }

  /**
   * Get payment details for an appointment
   */
  async getPaymentDetails(appointmentId: string) {
    try {
      const payment = await paymentRepository.findByAppointmentId(appointmentId);
      
      if (!payment) {
        return null;
      }

      return {
        id: payment.id,
        appointmentId: payment.appointment_id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.payment_method,
        stripeSessionId: payment.stripe_session_id,
        stripePaymentIntentId: payment.stripe_payment_intent_id,
        errorMessage: payment.error_message,
        createdAt: payment.created_at,
        updatedAt: payment.updated_at,
      };
    } catch (error) {
      logger.error('Failed to get payment details', { appointmentId, error });
      throw AppError.internal('Failed to fetch payment details');
    }
  }

  /**
   * Verify webhook signature (utility method for middleware)
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    try {
      if (!this.stripe || !env.STRIPE_WEBHOOK_SECRET) {
        return false;
      }

      this.stripe.webhooks.constructEvent(
        payload,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
      
      return true;
    } catch (error) {
      logger.error('Webhook signature verification failed', { error });
      return false;
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
