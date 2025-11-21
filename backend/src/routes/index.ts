import { Router } from 'express';
import { appointmentsRouter } from './appointments.routes.js';
import { availabilityRouter } from './availability.routes.js';
import { profilesRouter } from './profiles.routes.js';
import { dentistRouter } from './dentist.routes.js';
import { paymentsRouter } from './payments.routes.js';
import realtimeRouter from './realtime.routes.js';
import realtimeSyncRouter from './realtime-sync.routes.js';
import { chatbotRouter } from './chatbot.routes.js';
import { adminRouter } from './admin.routes.js';

const router = Router();

/**
 * API Routes Configuration
 * 
 * All routes are prefixed with /api (configured in env.API_PREFIX)
 * Rate limiting is applied globally to all API routes
 * 
 * Available endpoints:
 * - /api/appointments/* - Appointment booking and management
 * - /api/payments/* - Payment processing (Stripe integration)
 * - /api/availability/* - Dentist availability management
 * - /api/profiles/* - User profile management
 * - /api/dentists/* - Dentist-specific operations
 * - /api/realtime/* - Real-time synchronization endpoints (legacy)
 * - /api/sync/* - Real-time sync service endpoints
 * - /api/chatbot/* - Chatbot conversation and PDF generation
 * - /api/auth/dentist/login - Dentist authentication
 */

// Mount route modules
router.use('/appointments', appointmentsRouter);
router.use('/availability', availabilityRouter);
router.use('/profiles', profilesRouter);
router.use('/payments', paymentsRouter);
router.use('/realtime', realtimeRouter); // Legacy realtime routes
router.use('/sync', realtimeSyncRouter); // Real-time sync service
router.use('/chatbot', chatbotRouter); // Chatbot routes
router.use('/admin', adminRouter); // Admin routes
router.use('/', dentistRouter); // Dentist routes (includes /auth/dentist/login and /dentists/*)

export default router;
