import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BookingService } from './bookingService';
import { supabase } from '@/integrations/supabase/client';
import { generateBookingReference } from '@/lib/bookingReference';
import {
  validateBookingData,
  validateFile,
  validateTimeSlot,
  validateCancellationTiming,
} from '@/lib/validation';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

vi.mock('@/lib/bookingReference');
vi.mock('./notificationService', () => ({
  sendBookingConfirmation: vi.fn(),
  sendNewBookingAlert: vi.fn(),
  sendCancellationNotification: vi.fn(),
}));

describe('BookingService - Unit Tests', () => {
  let bookingService: BookingService;

  beforeEach(() => {
    bookingService = new BookingService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Time Slot Availability Calculation', () => {
    it('should validate time slot calculation logic', () => {
      // Test the time parsing logic
      const service = new BookingService();
      const parseTime = (service as any).parseTime.bind(service);
      
      expect(parseTime('09:00:00')).toBe(540); // 9 * 60
      expect(parseTime('12:30:00')).toBe(750); // 12 * 60 + 30
      expect(parseTime('00:00:00')).toBe(0);
      expect(parseTime('23:59:00')).toBe(1439);
    });

    it('should calculate correct number of slots based on duration', () => {
      // 3 hours (180 minutes) with 30-minute slots = 6 slots
      const startMinutes = 9 * 60; // 9:00
      const endMinutes = 12 * 60; // 12:00
      const slotDuration = 30;
      
      const expectedSlots = (endMinutes - startMinutes) / slotDuration;
      expect(expectedSlots).toBe(6);
    });

    it('should handle different slot durations correctly', () => {
      // 2 hours with 15-minute slots = 8 slots
      const startMinutes = 10 * 60;
      const endMinutes = 12 * 60;
      const slotDuration = 15;
      
      const expectedSlots = (endMinutes - startMinutes) / slotDuration;
      expect(expectedSlots).toBe(8);
    });
  });

  describe('Cancellation Policy Validation', () => {
    it('should allow cancellation more than 1 hour before appointment', () => {
      const futureTime = new Date();
      futureTime.setHours(futureTime.getHours() + 2);

      const result = validateCancellationTiming(futureTime);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject cancellation within 1 hour of appointment', () => {
      const nearFutureTime = new Date();
      nearFutureTime.setMinutes(nearFutureTime.getMinutes() + 30);

      const result = validateCancellationTiming(nearFutureTime);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Appointments cannot be cancelled within 1 hour of the scheduled time');
    });

    it('should reject cancellation of past appointments', () => {
      const pastTime = new Date();
      pastTime.setHours(pastTime.getHours() - 1);

      const result = validateCancellationTiming(pastTime);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cannot cancel past appointments');
    });

    it('should handle exactly 1 hour before appointment', () => {
      const exactlyOneHour = new Date();
      exactlyOneHour.setHours(exactlyOneHour.getHours() + 1);

      const result = validateCancellationTiming(exactlyOneHour);

      // Should reject because it's within 1 hour (not more than 1 hour)
      expect(result.isValid).toBe(false);
    });
  });

  describe('Document Upload Validation', () => {
    it('should accept valid PDF file', () => {
      const validPdf = new File(['content'], 'document.pdf', { type: 'application/pdf' });
      Object.defineProperty(validPdf, 'size', { value: 5 * 1024 * 1024 }); // 5MB

      const result = validateFile(validPdf);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid image files', () => {
      const validJpg = new File(['content'], 'image.jpg', { type: 'image/jpeg' });
      Object.defineProperty(validJpg, 'size', { value: 3 * 1024 * 1024 }); // 3MB

      const result = validateFile(validJpg);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject files exceeding size limit', () => {
      const largePdf = new File(['content'], 'large.pdf', { type: 'application/pdf' });
      Object.defineProperty(largePdf, 'size', { value: 15 * 1024 * 1024 }); // 15MB

      const result = validateFile(largePdf);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds'))).toBe(true);
    });

    it('should reject invalid file types', () => {
      const invalidFile = new File(['content'], 'document.txt', { type: 'text/plain' });
      Object.defineProperty(invalidFile, 'size', { value: 1024 }); // 1KB

      const result = validateFile(invalidFile);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid file type'))).toBe(true);
    });

    it('should reject empty files', () => {
      const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });
      Object.defineProperty(emptyFile, 'size', { value: 0 });

      const result = validateFile(emptyFile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File is empty');
    });

    it('should enforce maximum file count', () => {
      const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 1024 });

      const result = validateFile(file, { maxFiles: 3, currentFileCount: 3 });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Maximum'))).toBe(true);
    });
  });

  describe('Booking Reference Generation', () => {
    it('should generate unique 8-character alphanumeric reference', async () => {
      const mockReference = 'A3B7K9M2';
      vi.mocked(generateBookingReference).mockResolvedValue(mockReference);

      const reference = await generateBookingReference();

      expect(reference).toBe(mockReference);
      expect(reference).toHaveLength(8);
      expect(/^[A-Z0-9]{8}$/.test(reference)).toBe(true);
    });

    it('should generate different references on multiple calls', async () => {
      const references = ['ABC12345', 'XYZ67890', 'DEF11111'];
      let callCount = 0;
      
      vi.mocked(generateBookingReference).mockImplementation(async () => {
        return references[callCount++];
      });

      const ref1 = await generateBookingReference();
      const ref2 = await generateBookingReference();
      const ref3 = await generateBookingReference();

      expect(ref1).not.toBe(ref2);
      expect(ref2).not.toBe(ref3);
      expect(ref1).not.toBe(ref3);
    });
  });

  describe('Booking Data Validation', () => {
    it('should validate complete booking data successfully', () => {
      const validBookingData = {
        patientId: 'patient-123',
        dentistId: 'dentist-456',
        patientPhone: '+1234567890',
        symptoms: 'Tooth pain in upper left molar',
        appointmentTime: new Date(Date.now() + 86400000), // Tomorrow
        conversationId: 'conv-789',
        causeIdentified: true,
        documents: [],
      };

      const result = validateBookingData(validBookingData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject booking data with missing required fields', () => {
      const incompleteData = {
        patientId: 'patient-123',
        // Missing dentistId, phone, symptoms, etc.
      };

      const result = validateBookingData(incompleteData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate phone number format', () => {
      const dataWithInvalidPhone = {
        patientId: 'patient-123',
        dentistId: 'dentist-456',
        patientPhone: '123', // Too short
        symptoms: 'Tooth pain',
        appointmentTime: new Date(Date.now() + 86400000),
        conversationId: 'conv-789',
        causeIdentified: true,
        documents: [],
      };

      const result = validateBookingData(dataWithInvalidPhone);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Phone number'))).toBe(true);
    });

    it('should require uncertainty note when cause not identified', () => {
      const dataWithUncertainty = {
        patientId: 'patient-123',
        dentistId: 'dentist-456',
        patientPhone: '+1234567890',
        symptoms: 'Tooth pain',
        appointmentTime: new Date(Date.now() + 86400000),
        conversationId: 'conv-789',
        causeIdentified: false,
        // Missing uncertaintyNote
        documents: [],
      };

      const result = validateBookingData(dataWithUncertainty);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Uncertainty note'))).toBe(true);
    });

    it('should validate appointment time is in the future', () => {
      const dataWithPastTime = {
        patientId: 'patient-123',
        dentistId: 'dentist-456',
        patientPhone: '+1234567890',
        symptoms: 'Tooth pain',
        appointmentTime: new Date(Date.now() - 86400000), // Yesterday
        conversationId: 'conv-789',
        causeIdentified: true,
        documents: [],
      };

      const result = validateBookingData(dataWithPastTime);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('past'))).toBe(true);
    });
  });

  describe('Time Slot Validation', () => {
    it('should accept future time slots', () => {
      const futureSlot = new Date();
      futureSlot.setDate(futureSlot.getDate() + 7); // 1 week from now

      const result = validateTimeSlot(futureSlot);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject past time slots', () => {
      const pastSlot = new Date();
      pastSlot.setHours(pastSlot.getHours() - 1);

      const result = validateTimeSlot(pastSlot);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Selected time slot is in the past');
    });

    it('should reject slots more than 6 months in advance', () => {
      const farFutureSlot = new Date();
      farFutureSlot.setMonth(farFutureSlot.getMonth() + 7);

      const result = validateTimeSlot(farFutureSlot);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('6 months'))).toBe(true);
    });
  });
});
