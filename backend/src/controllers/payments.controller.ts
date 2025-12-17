import { Request, Response } from 'express';
import { z } from 'zod';
import { paymentService } from '../services/payment.service.js';
import { logger } from '../config/logger.js';
import { asyncHandler } from '../utils/async-handler.js';
import { AppError } from '../utils/errors.js';
import { AuthenticatedRequest } from '../types/index.js';

// Validation schema for create checkout session request
const createCheckoutSessionSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID'),
  amount: z.number().int().positive('Amount must be a positive integer'),
  currency: z.string().length(3, 'Currency must be a 3-letter code').default('usd'),
  dentistName: z.string().min(1, 'Dentist name is required'),
  patientEmail: z.string().email('Invalid patient email'),
  patientName: z.string().optional(), // Made optional - not always sent by frontend
  appointmentDate: z.string().min(1, 'Appointment date is required'),
  appointmentTime: z.string().min(1, 'Appointment time is required'),
});

export class PaymentsController {
  /**
   * POST /api/payments/create-checkout-session
   * Create a Stripe Checkout session for appointment payment
   */
  createCheckoutSession = asyncHandler(async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = createCheckoutSessionSchema.parse(req.body);

      logger.info('Creating Stripe Checkout session', {
        appointmentId: validatedData.appointmentId,
        amount: validatedData.amount,
        currency: validatedData.currency,
      });

      // Create checkout session
      const session = await paymentService.createCheckoutSession({
        appointmentId: validatedData.appointmentId,
        amount: validatedData.amount,
        currency: validatedData.currency,
        dentistName: validatedData.dentistName,
        patientEmail: validatedData.patientEmail,
        patientName: validatedData.patientName || validatedData.patientEmail.split('@')[0], // Use email prefix as fallback
        appointmentDate: validatedData.appointmentDate,
        appointmentTime: validatedData.appointmentTime,
      });

      logger.info('Stripe Checkout session created successfully', {
        sessionId: session.sessionId,
        appointmentId: validatedData.appointmentId,
      });

      res.status(201).json({
        success: true,
        data: {
          sessionId: session.sessionId,
          url: session.url,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = (error as any).issues || (error as any).errors || [];
        logger.warn('Validation error in create checkout session', {
          errors: issues,
        });
        throw AppError.validation('Invalid request data', {
          errors: issues,
        });
      }

      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Failed to create checkout session', { error });
      throw AppError.payment('Failed to create payment session');
    }
  });

  /**
   * POST /api/payments/webhook
   * Handle Stripe webhook events
   * Note: This endpoint should NOT use the standard auth middleware
   * as Stripe webhooks use signature verification instead
   */
  handleWebhook = asyncHandler(async (req: Request, res: Response) => {
    try {
      const signature = req.headers['stripe-signature'];

      if (!signature || typeof signature !== 'string') {
        logger.warn('Missing Stripe signature in webhook request');
        throw AppError.validation('Missing Stripe signature');
      }

      // Get raw body (should be set by middleware)
      const rawBody = (req as any).rawBody;

      if (!rawBody) {
        logger.error('Raw body not available for webhook verification');
        throw AppError.internal('Webhook payload not available');
      }

      logger.info('Processing Stripe webhook', {
        signature: signature.substring(0, 20) + '...',
      });

      // Handle the webhook event
      await paymentService.handleWebhookEvent(rawBody, signature);

      logger.info('Webhook processed successfully');

      // Return 200 to acknowledge receipt
      res.status(200).json({
        success: true,
        message: 'Webhook received',
      });
    } catch (error) {
      if (error instanceof AppError) {
        // For webhook errors, we still want to return 200 to Stripe
        // to prevent retries for validation errors
        if (error.code === 'VALIDATION_ERROR') {
          logger.error('Webhook validation error', { error: error.message });
          return res.status(400).json({
            success: false,
            error: {
              code: error.code,
              message: error.message,
            },
          });
        }
        throw error;
      }

      logger.error('Failed to process webhook', { error });
      throw AppError.internal('Failed to process webhook event');
    }
  });

  /**
   * GET /api/payments/appointment/:appointmentId
   * Get payment details for an appointment
   */
  getPaymentDetails = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { appointmentId } = req.params;

      if (!appointmentId) {
        throw AppError.validation('Appointment ID is required');
      }

      logger.info('Fetching payment details', {
        appointmentId,
        userId: req.user?.id,
      });

      const paymentDetails = await paymentService.getPaymentDetails(appointmentId);

      if (!paymentDetails) {
        throw AppError.notFound('Payment details not found');
      }

      res.status(200).json({
        success: true,
        data: paymentDetails,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Failed to fetch payment details', {
        appointmentId: req.params.appointmentId,
        error,
      });
      throw AppError.internal('Failed to fetch payment details');
    }
  });
}

// Export singleton instance
export const paymentsController = new PaymentsController();
