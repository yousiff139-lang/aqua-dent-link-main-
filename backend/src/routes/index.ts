import { Router } from 'express';
import { appointmentsRouter } from './appointments.routes.js';
import { availabilityRouter } from './availability.routes.js';
import { profilesRouter } from './profiles.routes.js';
import { dentistRouter } from './dentist.routes.js';
import { paymentsRouter } from './payments.routes.js';
import realtimeRouter from './realtime.routes.js';

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
 * - /api/realtime/* - Real-time synchronization endpoints
 * - /api/auth/dentist/login - Dentist authentication
 */

// Mount route modules
router.use('/appointments', appointmentsRouter);
router.use('/availability', availabilityRouter);
router.use('/profiles', profilesRouter);
router.use('/payments', paymentsRouter);
router.use('/realtime', realtimeRouter);
router.use('/', dentistRouter); // Dentist routes (includes /auth/dentist/login and /dentists/*)

export default router;
