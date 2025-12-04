import { Response } from 'express';
import { appointmentsService } from '../services/appointments.service.js';
import { validationService } from '../services/validation.service.js';
import { AuthenticatedRequest } from '../types/index.js';
import { asyncHandler } from '../utils/async-handler.js';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/errors.js';

export class AppointmentsController {
  /**
   * POST /api/appointments
   * Create new appointment
   */
  create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;

    // Validate request body
    const validatedData = validationService.validateCreateAppointment(req.body);

    try {
      // Create appointment
      const appointment = await appointmentsService.createAppointment(
        validatedData,
        userId
      );

      logger.info('Appointment created', {
        appointmentId: appointment.id,
        userId,
        patientEmail: validatedData.patient_email,
        dentistEmail: validatedData.dentist_email,
      });

      res.status(201).json({
        success: true,
        data: {
          appointmentId: appointment.id,
          status: appointment.status,
          paymentStatus: appointment.payment_status,
          appointment,
        },
      });
    } catch (error) {
      // If slot is unavailable, get alternative slots and include in error response
      if (error instanceof AppError && error.code === 'SLOT_UNAVAILABLE') {
        const alternativeSlots = await appointmentsService.getAlternativeSlots(
          validatedData.dentist_email,
          validatedData.appointment_date,
          validatedData.appointment_time,
          5
        );

        logger.warn('Slot unavailable, providing alternatives', {
          dentistEmail: validatedData.dentist_email,
          requestedDate: validatedData.appointment_date,
          requestedTime: validatedData.appointment_time,
          alternativesCount: alternativeSlots.length,
        });

        res.status(409).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: {
              alternativeSlots: alternativeSlots.map((time) => ({
                date: validatedData.appointment_date,
                time,
              })),
            },
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Re-throw other errors to be handled by error middleware
      throw error;
    }
  });

  /**
   * GET /api/appointments/dentist/:dentistEmail
   * Get appointments for a specific dentist with query filters
   */
  getByDentistEmail = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dentistEmail } = req.params;
    const userId = req.user.id;

    // Validate email format
    if (!dentistEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dentistEmail)) {
      throw AppError.validation('Invalid dentist email format');
    }

    // Validate query parameters
    const filters = validationService.validateAppointmentFilters(req.query);

    // Convert string dates to Date objects if provided
    if (filters.date_from) {
      filters.date_from = new Date(filters.date_from);
    }
    if (filters.date_to) {
      filters.date_to = new Date(filters.date_to);
    }

    // Authorization: Only the dentist themselves can access their appointments
    // Check if the authenticated user's email matches the dentist email
    if (req.user.email !== dentistEmail && req.user.role !== 'admin') {
      throw AppError.forbidden('Not authorized to access these appointments');
    }

    // Get appointments for dentist
    const result = await appointmentsService.getAppointmentsByDentist(
      dentistEmail,
      filters
    );

    logger.info('Dentist appointments retrieved', {
      dentistEmail,
      userId,
      count: result.data.length,
    });

    res.json({
      success: true,
      ...result,
    });
  });

  /**
   * GET /api/appointments/patient/:email
   * Get appointments for a specific patient
   */
  getByPatientEmail = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email } = req.params;
    const userId = req.user.id;

    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw AppError.validation('Invalid patient email format');
    }

    // Validate query parameters
    const filters = validationService.validateAppointmentFilters(req.query);

    // Convert string dates to Date objects if provided
    if (filters.date_from) {
      filters.date_from = new Date(filters.date_from);
    }
    if (filters.date_to) {
      filters.date_to = new Date(filters.date_to);
    }

    // Authorization: Only the patient themselves can access their appointments
    if (req.user.email !== email && req.user.role !== 'admin') {
      throw AppError.forbidden('Not authorized to access these appointments');
    }

    // Get appointments for patient
    const appointments = await appointmentsService.getAppointmentsByPatient(
      email,
      filters
    );

    logger.info('Patient appointments retrieved', {
      patientEmail: email,
      userId,
      count: appointments.length,
    });

    res.json({
      success: true,
      data: appointments,
      count: appointments.length,
    });
  });

  /**
   * GET /api/appointments/:id
   * Get appointment by ID
   */
  getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.id;

    validationService.validateUUID(id, 'Appointment ID');

    const appointment = await appointmentsService.getAppointmentById(id, userId);

    logger.info('Appointment retrieved', {
      appointmentId: id,
      userId,
    });

    res.json({
      success: true,
      data: appointment,
    });
  });

  /**
   * PUT /api/appointments/:id
   * Update appointment
   */
  update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.id;

    validationService.validateUUID(id, 'Appointment ID');

    // Validate request body
    const validatedData = validationService.validateUpdateAppointment(req.body);

    try {
      // If marking as completed, use the dedicated method
      if (validatedData.status === 'completed') {
        const appointment = await appointmentsService.markAppointmentComplete(id, userId);
        
        logger.info('Appointment marked as completed', {
          appointmentId: id,
          userId,
        });

        res.json({
          success: true,
          data: appointment,
        });
        return;
      }

      // Update appointment
      const appointment = await appointmentsService.updateAppointment(
        id,
        validatedData,
        userId
      );

      logger.info('Appointment updated', {
        appointmentId: id,
        userId,
        updates: validatedData,
      });

      res.json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      // If slot is unavailable during reschedule, get alternative slots
      if (error instanceof AppError && error.code === 'SLOT_UNAVAILABLE' && 
          (validatedData.appointment_date || validatedData.appointment_time)) {
        
        // Get the appointment to find dentist email
        const appointment = await appointmentsService.getAppointmentById(id, userId);
        
        const alternativeSlots = await appointmentsService.getAlternativeSlots(
          appointment.dentist_email,
          validatedData.appointment_date || appointment.appointment_date.toString().split('T')[0],
          validatedData.appointment_time || appointment.appointment_time,
          5
        );

        logger.warn('Reschedule slot unavailable, providing alternatives', {
          appointmentId: id,
          dentistEmail: appointment.dentist_email,
          requestedDate: validatedData.appointment_date,
          requestedTime: validatedData.appointment_time,
          alternativesCount: alternativeSlots.length,
        });

        res.status(409).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: {
              alternativeSlots: alternativeSlots.map((time) => ({
                date: validatedData.appointment_date || appointment.appointment_date.toString().split('T')[0],
                time,
              })),
            },
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Re-throw other errors to be handled by error middleware
      throw error;
    }
  });

  /**
   * DELETE /api/appointments/:id
   * Cancel appointment
   */
  cancel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.id;

    validationService.validateUUID(id, 'Appointment ID');

    // Cancel appointment
    const cancelledAppointment = await appointmentsService.cancelAppointment(id, userId);

    logger.info('Appointment cancelled', {
      appointmentId: id,
      userId,
    });

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: cancelledAppointment,
    });
  });
}

// Export singleton instance
export const appointmentsController = new AppointmentsController();
