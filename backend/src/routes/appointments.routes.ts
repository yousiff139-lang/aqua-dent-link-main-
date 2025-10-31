import { Router } from 'express';
import { appointmentsController } from '../controllers/appointments.controller.js';
import { authenticateRequest, optionalAuth } from '../middleware/auth.js';
import { bookingLimiter } from '../middleware/rate-limiter.js';

const router = Router();

// POST /api/appointments - Create new appointment (optional auth for guest bookings)
// Apply stricter rate limiting to prevent booking abuse
router.post('/', bookingLimiter, optionalAuth, appointmentsController.create);

// All other appointment routes require authentication
router.use(authenticateRequest);

// GET /api/appointments/dentist/:dentistEmail - Get appointments for a dentist
router.get('/dentist/:dentistEmail', appointmentsController.getByDentistEmail);

// GET /api/appointments/patient/:email - Get appointments for a patient
router.get('/patient/:email', appointmentsController.getByPatientEmail);

// GET /api/appointments/:id - Get appointment by ID
router.get('/:id', appointmentsController.getById);

// PUT /api/appointments/:id - Update appointment
router.put('/:id', appointmentsController.update);

// DELETE /api/appointments/:id - Cancel appointment
router.delete('/:id', appointmentsController.cancel);

export { router as appointmentsRouter };
