import { Router } from 'express';
import { paymentsController } from '../controllers/payments.controller.js';
import { authenticateRequest, optionalAuth } from '../middleware/auth.js';
import { verifyStripeSignature } from '../middleware/raw-body.js';
import { strictLimiter } from '../middleware/rate-limiter.js';

const router = Router();

// POST /api/payments/create-checkout-session - Create Stripe Checkout session
// Optional auth to allow guest bookings
// Apply strict rate limiting to prevent payment abuse
router.post('/create-checkout-session', strictLimiter, optionalAuth, paymentsController.createCheckoutSession);

// POST /api/payments/webhook - Handle Stripe webhooks
// This endpoint uses Stripe signature verification instead of JWT auth
// No rate limiting on webhooks as they come from Stripe
router.post('/webhook', verifyStripeSignature, paymentsController.handleWebhook);

// GET /api/payments/appointment/:appointmentId - Get payment details (requires auth)
router.get('/appointment/:appointmentId', authenticateRequest, paymentsController.getPaymentDetails);

export { router as paymentsRouter };
