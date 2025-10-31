import { Router } from 'express';
import { availabilityController } from '../controllers/availability.controller.js';
import { authenticateRequest } from '../middleware/auth.js';

const router = Router();

// All availability routes require authentication
router.use(authenticateRequest);

// POST /api/availability/reserve - Reserve a slot
router.post('/reserve', availabilityController.reserveSlot);

// DELETE /api/availability/reserve/:id - Release a reservation
router.delete('/reserve/:id', availabilityController.releaseSlot);

// GET /api/availability/:dentistId - Get dentist availability
router.get('/:dentistId', availabilityController.getByDentist);

// PUT /api/availability/:dentistId - Update dentist availability
router.put('/:dentistId', availabilityController.update);

// GET /api/availability/:dentistId/slots - Get available slots
router.get('/:dentistId/slots', availabilityController.getAvailableSlots);

export { router as availabilityRouter };
