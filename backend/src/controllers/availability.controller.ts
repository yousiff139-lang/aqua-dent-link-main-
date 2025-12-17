import { Response } from 'express';
import { availabilityService } from '../services/availability.service.js';
import { validationService } from '../services/validation.service.js';
import { AuthenticatedRequest } from '../types/index.js';
import { asyncHandler } from '../utils/async-handler.js';
import { logger } from '../config/logger.js';

export class AvailabilityController {
  /**
   * GET /api/availability/:dentistId
   * Get dentist availability schedule
   */
  getByDentist = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dentistId } = req.params;

    // For now, return empty array (mock data)
    logger.info('Availability retrieved (mock)', {
      dentistId,
      userId: req.user?.id,
    });

    res.json([]);
  });

  /**
   * PUT /api/availability/:dentistId
   * Update dentist availability schedule
   */
  update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dentistId } = req.params;
    const userId = req.user?.id;

    // For now, return the slots as-is (mock data)
    logger.info('Availability updated (mock)', {
      dentistId,
      userId,
    });

    res.json(req.body.slots || []);
  });

  /**
   * GET /api/availability/:dentistId/slots
   * Get available time slots for a specific date
   */
  getAvailableSlots = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dentistId } = req.params;
    const { date } = req.query;

    validationService.validateUUID(dentistId, 'Dentist ID');

    if (!date || typeof date !== 'string') {
      throw validationService.validateSlotQuery({ date: '' });
    }

    // Validate date format
    validationService.validateSlotQuery({ date });

    // Parse date
    const requestedDate = new Date(date);

    // Get available slots
    const slots = await availabilityService.getAvailableSlots(dentistId, requestedDate);

    logger.info('Available slots retrieved', {
      dentistId,
      date,
      slotsCount: slots.length,
      userId: req.user?.id,
    });

    res.json({
      dentist_id: dentistId,
      date,
      slots,
      count: slots.length,
    });
  });

  /**
   * POST /api/availability/reserve
   * Reserve a time slot temporarily
   */
  reserveSlot = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { dentist_id, slot_time } = req.body;

    if (!dentist_id || !slot_time) {
      throw validationService.validateCreateAppointment({
        dentist_id,
        appointment_date: slot_time,
        appointment_type: 'temp',
      });
    }

    validationService.validateUUID(dentist_id, 'Dentist ID');

    const slotDate = new Date(slot_time);
    validationService.validateFutureDate(slotDate, 'Slot time');

    // Reserve slot
    const reservation = await availabilityService.reserveSlot(
      dentist_id,
      slotDate,
      userId!
    );

    logger.info('Slot reserved', {
      reservationId: reservation.id,
      dentistId: dentist_id,
      userId,
      slotTime: slot_time,
    });

    res.status(201).json(reservation);
  });

  /**
   * DELETE /api/availability/reserve/:id
   * Release a reserved slot
   */
  releaseSlot = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    validationService.validateUUID(id, 'Reservation ID');

    // Release slot
    await availabilityService.releaseSlot(id, userId!);

    logger.info('Slot reservation released', {
      reservationId: id,
      userId,
    });

    res.status(204).send();
  });
}

// Export singleton instance
export const availabilityController = new AvailabilityController();
