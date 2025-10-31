/**
 * Unit tests for AppointmentsService
 * 
 * Tests business logic for appointment management including:
 * - Creating appointments with validation
 * - Updating appointments with authorization
 * - Slot availability checking
 * - Date validation
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppointmentsService } from '../services/appointments.service.js';
import { appointmentsRepository } from '../repositories/appointments.repository.js';
import { AppError } from '../utils/errors.js';
import { CreateAppointmentDTO, UpdateAppointmentDTO, Appointment } from '../types/index.js';

// Mock the repository
vi.mock('../repositories/appointments.repository.js', () => ({
  appointmentsRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findByPatientEmail: vi.fn(),
    findByDentistEmail: vi.fn(),
    checkSlotAvailability: vi.fn(),
    getAlternativeSlots: vi.fn(),
  },
}));

// Mock the logger
vi.mock('../config/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock supabase config
vi.mock('../config/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'dentist-123' },
            error: null,
          })),
        })),
      })),
    })),
  },
}));

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  beforeEach(() => {
    service = new AppointmentsService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createAppointment', () => {
    const validAppointmentData: CreateAppointmentDTO = {
      patient_name: 'John Doe',
      patient_email: 'john@example.com',
      patient_phone: '+1234567890',
      dentist_email: 'dr.smith@dental.com',
      dentist_id: 'dentist-123',
      reason: 'Regular checkup',
      appointment_date: '2025-12-01',
      appointment_time: '10:00',
      payment_method: 'stripe',
    };

    it('should create appointment with valid data', async () => {
      const mockAppointment: Appointment = {
        id: 'apt-123',
        ...validAppointmentData,
        patient_id: 'patient-123',
        appointment_date: new Date('2025-12-01'),
        payment_status: 'pending',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(appointmentsRepository.checkSlotAvailability).mockResolvedValue(true);
      vi.mocked(appointmentsRepository.create).mockResolvedValue(mockAppointment);

      const result = await service.createAppointment(validAppointmentData, 'patient-123');

      expect(result).toEqual(mockAppointment);
      expect(appointmentsRepository.checkSlotAvailability).toHaveBeenCalledWith(
        validAppointmentData.dentist_email,
        validAppointmentData.appointment_date,
        validAppointmentData.appointment_time,
        undefined
      );
      expect(appointmentsRepository.create).toHaveBeenCalled();
    });

    it('should throw validation error for missing patient name', async () => {
      const invalidData = { ...validAppointmentData, patient_name: '' };

      await expect(service.createAppointment(invalidData)).rejects.toThrow(AppError);
      await expect(service.createAppointment(invalidData)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Patient information is required',
      });
    });

    it('should throw validation error for missing patient email', async () => {
      const invalidData = { ...validAppointmentData, patient_email: '' };

      await expect(service.createAppointment(invalidData)).rejects.toThrow(AppError);
    });

    it('should throw validation error for invalid email format', async () => {
      const invalidData = { ...validAppointmentData, patient_email: 'invalid-email' };

      await expect(service.createAppointment(invalidData)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Invalid email format',
      });
    });

    it('should throw validation error for past date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const invalidData = {
        ...validAppointmentData,
        appointment_date: pastDate.toISOString().split('T')[0],
      };

      await expect(service.createAppointment(invalidData)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Appointment date cannot be in the past',
      });
    });

    it('should throw slot unavailable error when slot is taken', async () => {
      vi.mocked(appointmentsRepository.checkSlotAvailability).mockResolvedValue(false);
      vi.mocked(appointmentsRepository.getAlternativeSlots).mockResolvedValue([
        '10:30',
        '11:00',
        '11:30',
      ]);

      await expect(service.createAppointment(validAppointmentData)).rejects.toMatchObject({
        code: 'SLOT_UNAVAILABLE',
        message: 'The selected time slot is no longer available',
      });
    });

    it('should throw validation error for missing payment method', async () => {
      const invalidData = { ...validAppointmentData, payment_method: '' as any };

      await expect(service.createAppointment(invalidData)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Payment method is required',
      });
    });
  });

  describe('updateAppointment', () => {
    const mockExistingAppointment: Appointment = {
      id: 'apt-123',
      patient_id: 'patient-123',
      patient_name: 'John Doe',
      patient_email: 'john@example.com',
      patient_phone: '+1234567890',
      dentist_id: 'dentist-123',
      dentist_email: 'dr.smith@dental.com',
      reason: 'Regular checkup',
      appointment_date: new Date('2025-12-01'),
      appointment_time: '10:00',
      payment_method: 'stripe',
      payment_status: 'pending',
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should update appointment with valid data', async () => {
      const updateData: UpdateAppointmentDTO = {
        notes: 'Patient requested morning slot',
      };

      vi.mocked(appointmentsRepository.findById).mockResolvedValue(mockExistingAppointment);
      vi.mocked(appointmentsRepository.update).mockResolvedValue({
        ...mockExistingAppointment,
        ...updateData,
      });

      const result = await service.updateAppointment(
        'apt-123',
        updateData,
        'patient-123'
      );

      expect(result.notes).toBe(updateData.notes);
      expect(appointmentsRepository.update).toHaveBeenCalledWith('apt-123', updateData);
    });

    it('should throw not found error for non-existent appointment', async () => {
      vi.mocked(appointmentsRepository.findById).mockResolvedValue(null);

      await expect(
        service.updateAppointment('apt-999', {}, 'patient-123')
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Appointment not found',
      });
    });

    it('should throw forbidden error for unauthorized user', async () => {
      vi.mocked(appointmentsRepository.findById).mockResolvedValue(mockExistingAppointment);

      await expect(
        service.updateAppointment('apt-123', {}, 'unauthorized-user')
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'Not authorized to update this appointment',
      });
    });

    it('should check slot availability when updating date/time', async () => {
      const updateData: UpdateAppointmentDTO = {
        appointment_date: '2025-12-02',
        appointment_time: '14:00',
      };

      vi.mocked(appointmentsRepository.findById).mockResolvedValue(mockExistingAppointment);
      vi.mocked(appointmentsRepository.checkSlotAvailability).mockResolvedValue(true);
      vi.mocked(appointmentsRepository.update).mockResolvedValue({
        ...mockExistingAppointment,
        ...updateData,
      });

      await service.updateAppointment('apt-123', updateData, 'patient-123');

      expect(appointmentsRepository.checkSlotAvailability).toHaveBeenCalledWith(
        mockExistingAppointment.dentist_email,
        updateData.appointment_date,
        updateData.appointment_time,
        'apt-123'
      );
    });

    it('should throw validation error when updating to past date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const updateData: UpdateAppointmentDTO = {
        appointment_date: pastDate.toISOString().split('T')[0],
      };

      vi.mocked(appointmentsRepository.findById).mockResolvedValue(mockExistingAppointment);

      await expect(
        service.updateAppointment('apt-123', updateData, 'patient-123')
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Appointment date cannot be in the past',
      });
    });
  });

  describe('cancelAppointment', () => {
    const mockAppointment: Appointment = {
      id: 'apt-123',
      patient_id: 'patient-123',
      patient_name: 'John Doe',
      patient_email: 'john@example.com',
      patient_phone: '+1234567890',
      dentist_id: 'dentist-123',
      dentist_email: 'dr.smith@dental.com',
      reason: 'Regular checkup',
      appointment_date: new Date('2025-12-01'),
      appointment_time: '10:00',
      payment_method: 'stripe',
      payment_status: 'pending',
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should cancel appointment for authorized patient', async () => {
      vi.mocked(appointmentsRepository.findById).mockResolvedValue(mockAppointment);
      vi.mocked(appointmentsRepository.delete).mockResolvedValue();

      await service.cancelAppointment('apt-123', 'patient-123');

      expect(appointmentsRepository.delete).toHaveBeenCalledWith('apt-123');
    });

    it('should cancel appointment for authorized dentist', async () => {
      vi.mocked(appointmentsRepository.findById).mockResolvedValue(mockAppointment);
      vi.mocked(appointmentsRepository.delete).mockResolvedValue();

      await service.cancelAppointment('apt-123', 'dentist-123');

      expect(appointmentsRepository.delete).toHaveBeenCalledWith('apt-123');
    });

    it('should throw forbidden error for unauthorized user', async () => {
      vi.mocked(appointmentsRepository.findById).mockResolvedValue(mockAppointment);

      await expect(
        service.cancelAppointment('apt-123', 'unauthorized-user')
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'Not authorized to cancel this appointment',
      });
    });

    it('should throw not found error for non-existent appointment', async () => {
      vi.mocked(appointmentsRepository.findById).mockResolvedValue(null);

      await expect(
        service.cancelAppointment('apt-999', 'patient-123')
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Appointment not found',
      });
    });
  });

  describe('markAppointmentComplete', () => {
    const mockAppointment: Appointment = {
      id: 'apt-123',
      patient_id: 'patient-123',
      patient_name: 'John Doe',
      patient_email: 'john@example.com',
      patient_phone: '+1234567890',
      dentist_id: 'dentist-123',
      dentist_email: 'dr.smith@dental.com',
      reason: 'Regular checkup',
      appointment_date: new Date('2025-10-20'),
      appointment_time: '10:00',
      payment_method: 'stripe',
      payment_status: 'paid',
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should mark appointment as complete for authorized dentist', async () => {
      vi.mocked(appointmentsRepository.findById).mockResolvedValue(mockAppointment);
      vi.mocked(appointmentsRepository.update).mockResolvedValue({
        ...mockAppointment,
        status: 'completed',
      });

      const result = await service.markAppointmentComplete('apt-123', 'dentist-123');

      expect(result.status).toBe('completed');
      expect(appointmentsRepository.update).toHaveBeenCalledWith('apt-123', {
        status: 'completed',
      });
    });

    it('should throw forbidden error for unauthorized dentist', async () => {
      vi.mocked(appointmentsRepository.findById).mockResolvedValue(mockAppointment);

      await expect(
        service.markAppointmentComplete('apt-123', 'wrong-dentist')
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'Not authorized to complete this appointment',
      });
    });

    it('should throw validation error for future appointment', async () => {
      const futureAppointment = {
        ...mockAppointment,
        appointment_date: new Date('2026-12-01'),
      };

      vi.mocked(appointmentsRepository.findById).mockResolvedValue(futureAppointment);

      await expect(
        service.markAppointmentComplete('apt-123', 'dentist-123')
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Cannot mark future appointments as completed',
      });
    });
  });

  describe('checkSlotAvailability', () => {
    it('should return true for available slot', async () => {
      vi.mocked(appointmentsRepository.checkSlotAvailability).mockResolvedValue(true);

      const result = await service.checkSlotAvailability(
        'dr.smith@dental.com',
        '2025-12-01',
        '10:00'
      );

      expect(result).toBe(true);
    });

    it('should return false for unavailable slot', async () => {
      vi.mocked(appointmentsRepository.checkSlotAvailability).mockResolvedValue(false);

      const result = await service.checkSlotAvailability(
        'dr.smith@dental.com',
        '2025-12-01',
        '10:00'
      );

      expect(result).toBe(false);
    });

    it('should handle repository errors', async () => {
      vi.mocked(appointmentsRepository.checkSlotAvailability).mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        service.checkSlotAvailability('dr.smith@dental.com', '2025-12-01', '10:00')
      ).rejects.toThrow(AppError);
    });
  });

  describe('getAlternativeSlots', () => {
    it('should return alternative time slots', async () => {
      const mockSlots = ['10:30', '11:00', '11:30', '14:00', '14:30'];
      vi.mocked(appointmentsRepository.getAlternativeSlots).mockResolvedValue(mockSlots);

      const result = await service.getAlternativeSlots(
        'dr.smith@dental.com',
        '2025-12-01',
        '10:00',
        5
      );

      expect(result).toEqual(mockSlots);
      expect(appointmentsRepository.getAlternativeSlots).toHaveBeenCalledWith(
        'dr.smith@dental.com',
        '2025-12-01',
        '10:00',
        5
      );
    });

    it('should return empty array on error', async () => {
      vi.mocked(appointmentsRepository.getAlternativeSlots).mockRejectedValue(
        new Error('Database error')
      );

      const result = await service.getAlternativeSlots(
        'dr.smith@dental.com',
        '2025-12-01',
        '10:00'
      );

      expect(result).toEqual([]);
    });
  });

  describe('rescheduleAppointment', () => {
    const mockAppointment: Appointment = {
      id: 'apt-123',
      patient_id: 'patient-123',
      patient_name: 'John Doe',
      patient_email: 'john@example.com',
      patient_phone: '+1234567890',
      dentist_id: 'dentist-123',
      dentist_email: 'dr.smith@dental.com',
      reason: 'Regular checkup',
      appointment_date: new Date('2025-12-01'),
      appointment_time: '10:00',
      payment_method: 'stripe',
      payment_status: 'pending',
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should reschedule appointment with available slot', async () => {
      vi.mocked(appointmentsRepository.findById).mockResolvedValue(mockAppointment);
      vi.mocked(appointmentsRepository.checkSlotAvailability).mockResolvedValue(true);
      vi.mocked(appointmentsRepository.update).mockResolvedValue({
        ...mockAppointment,
        appointment_date: new Date('2025-12-02'),
        appointment_time: '14:00',
      });

      const result = await service.rescheduleAppointment(
        'apt-123',
        '2025-12-02',
        '14:00',
        'patient-123'
      );

      expect(result.appointment_time).toBe('14:00');
      expect(appointmentsRepository.update).toHaveBeenCalledWith('apt-123', {
        appointment_date: '2025-12-02',
        appointment_time: '14:00',
      });
    });

    it('should throw slot unavailable error when new slot is taken', async () => {
      vi.mocked(appointmentsRepository.findById).mockResolvedValue(mockAppointment);
      vi.mocked(appointmentsRepository.checkSlotAvailability).mockResolvedValue(false);
      vi.mocked(appointmentsRepository.getAlternativeSlots).mockResolvedValue([
        '14:30',
        '15:00',
      ]);

      await expect(
        service.rescheduleAppointment('apt-123', '2025-12-02', '14:00', 'patient-123')
      ).rejects.toMatchObject({
        code: 'SLOT_UNAVAILABLE',
        message: 'The selected time slot is not available',
      });
    });

    it('should throw validation error for past date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      vi.mocked(appointmentsRepository.findById).mockResolvedValue(mockAppointment);

      await expect(
        service.rescheduleAppointment(
          'apt-123',
          pastDate.toISOString().split('T')[0],
          '14:00',
          'patient-123'
        )
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Appointment date cannot be in the past',
      });
    });
  });

  describe('getAppointmentsByPatient', () => {
    it('should return patient appointments', async () => {
      const mockAppointments: Appointment[] = [
        {
          id: 'apt-1',
          patient_id: 'patient-123',
          patient_name: 'John Doe',
          patient_email: 'john@example.com',
          patient_phone: '+1234567890',
          dentist_id: 'dentist-123',
          dentist_email: 'dr.smith@dental.com',
          reason: 'Checkup',
          appointment_date: new Date('2025-12-01'),
          appointment_time: '10:00',
          payment_method: 'stripe',
          payment_status: 'paid',
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      vi.mocked(appointmentsRepository.findByPatientEmail).mockResolvedValue(
        mockAppointments
      );

      const result = await service.getAppointmentsByPatient('john@example.com');

      expect(result).toEqual(mockAppointments);
    });
  });

  describe('getAppointmentsByDentist', () => {
    it('should return dentist appointments with pagination', async () => {
      const mockAppointments: Appointment[] = [
        {
          id: 'apt-1',
          patient_id: 'patient-123',
          patient_name: 'John Doe',
          patient_email: 'john@example.com',
          patient_phone: '+1234567890',
          dentist_id: 'dentist-123',
          dentist_email: 'dr.smith@dental.com',
          reason: 'Checkup',
          appointment_date: new Date('2025-12-01'),
          appointment_time: '10:00',
          payment_method: 'stripe',
          payment_status: 'paid',
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      vi.mocked(appointmentsRepository.findByDentistEmail).mockResolvedValue(
        mockAppointments
      );

      const result = await service.getAppointmentsByDentist('dr.smith@dental.com');

      expect(result.data).toEqual(mockAppointments);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBe(1);
    });
  });
});
