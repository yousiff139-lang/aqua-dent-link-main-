import { describe, it, expect, beforeEach } from 'vitest';
import { appointmentsService } from '../services/appointments.service';
import { CreateAppointmentDTO } from '../types/index';

describe('Concurrent Booking Prevention', () => {
  const testDentistEmail = 'test-dentist@example.com';
  const testDate = '2025-12-01';
  const testTime = '10:00';

  const createTestAppointment = (): CreateAppointmentDTO => ({
    patient_name: 'Test Patient',
    patient_email: 'patient@example.com',
    patient_phone: '+1234567890',
    dentist_email: testDentistEmail,
    reason: 'Regular checkup',
    appointment_date: testDate,
    appointment_time: testTime,
    payment_method: 'cash',
  });

  it('should prevent double booking at the same time slot', async () => {
    const appointment1 = createTestAppointment();
    const appointment2 = {
      ...createTestAppointment(),
      patient_name: 'Another Patient',
      patient_email: 'another@example.com',
    };

    // Create first appointment
    const result1 = await appointmentsService.createAppointment(appointment1);
    expect(result1).toBeDefined();
    expect(result1.id).toBeDefined();

    // Try to create second appointment at the same time - should fail
    await expect(
      appointmentsService.createAppointment(appointment2)
    ).rejects.toThrow(/slot.*unavailable/i);
  });

  it('should provide alternative time slots when slot is unavailable', async () => {
    const appointment1 = createTestAppointment();
    const appointment2 = {
      ...createTestAppointment(),
      patient_name: 'Another Patient',
      patient_email: 'another@example.com',
    };

    // Create first appointment
    await appointmentsService.createAppointment(appointment1);

    // Try to create second appointment at the same time
    try {
      await appointmentsService.createAppointment(appointment2);
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      // Check that error includes alternative slots
      expect(error.details).toBeDefined();
      expect(error.details.alternativeSlots).toBeDefined();
      expect(Array.isArray(error.details.alternativeSlots)).toBe(true);
    }
  });

  it('should allow booking at different time slots', async () => {
    const appointment1 = createTestAppointment();
    const appointment2 = {
      ...createTestAppointment(),
      patient_name: 'Another Patient',
      patient_email: 'another@example.com',
      appointment_time: '11:00', // Different time
    };

    // Both appointments should succeed
    const result1 = await appointmentsService.createAppointment(appointment1);
    const result2 = await appointmentsService.createAppointment(appointment2);

    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
    expect(result1.id).not.toBe(result2.id);
  });

  it('should handle concurrent booking attempts with database constraint', async () => {
    const appointment1 = createTestAppointment();
    const appointment2 = {
      ...createTestAppointment(),
      patient_name: 'Another Patient',
      patient_email: 'another@example.com',
    };

    // Simulate concurrent requests
    const promises = [
      appointmentsService.createAppointment(appointment1),
      appointmentsService.createAppointment(appointment2),
    ];

    const results = await Promise.allSettled(promises);

    // One should succeed, one should fail
    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);

    // Check that the failed one has the slot unavailable error
    const failedResult = failed[0] as PromiseRejectedResult;
    expect(failedResult.reason.message).toMatch(/slot.*unavailable/i);
  });
});
