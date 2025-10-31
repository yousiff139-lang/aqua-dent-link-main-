/**
 * Integration tests for Appointments API endpoints
 * 
 * Tests the complete request/response cycle including:
 * - POST /api/appointments - Create appointment
 * - GET /api/appointments/dentist/:dentistEmail - Get dentist appointments
 * - GET /api/appointments/patient/:email - Get patient appointments
 * - GET /api/appointments/:id - Get appointment by ID
 * - PUT /api/appointments/:id - Update appointment
 * - DELETE /api/appointments/:id - Cancel appointment
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { Application } from 'express';
import { supabase } from '../../config/supabase.js';
import { generateTestToken } from '../setup/auth-mock.js';

describe('Appointments API Integration Tests', () => {
  let app: Application;
  let testDentistEmail: string;
  let testPatientEmail: string;
  let testDentistId: string;
  let testPatientId: string;
  let createdAppointmentId: string;

  beforeAll(async () => {
    app = createApp();
    
    // Create unique test emails
    const timestamp = Date.now();
    testDentistEmail = `test-dentist-${timestamp}@example.com`;
    testPatientEmail = `test-patient-${timestamp}@example.com`;

    // Create test dentist profile
    const { data: dentistProfile } = await supabase
      .from('profiles')
      .insert({
        email: testDentistEmail,
        full_name: 'Test Dentist',
      })
      .select()
      .single();

    testDentistId = dentistProfile?.id || '';

    // Create dentist record
    await supabase
      .from('dentists')
      .insert({
        id: testDentistId,
        specialization: 'General Dentistry',
        bio: 'Test dentist for integration tests',
      });

    // Create test patient profile
    const { data: patientProfile } = await supabase
      .from('profiles')
      .insert({
        email: testPatientEmail,
        full_name: 'Test Patient',
      })
      .select()
      .single();

    testPatientId = patientProfile?.id || '';
  });

  afterAll(async () => {
    // Cleanup test data
    if (createdAppointmentId) {
      await supabase.from('appointments').delete().eq('id', createdAppointmentId);
    }
    
    await supabase.from('appointments').delete().eq('dentist_email', testDentistEmail);
    await supabase.from('dentists').delete().eq('id', testDentistId);
    await supabase.from('profiles').delete().eq('email', testDentistEmail);
    await supabase.from('profiles').delete().eq('email', testPatientEmail);
  });

  beforeEach(() => {
    createdAppointmentId = '';
  });

  describe('POST /api/appointments', () => {
    it('should create a new appointment with valid data', async () => {
      const appointmentData = {
        patient_name: 'Test Patient',
        patient_email: testPatientEmail,
        patient_phone: '+1234567890',
        dentist_email: testDentistEmail,
        dentist_id: testDentistId,
        reason: 'Regular checkup',
        appointment_date: '2025-12-01',
        appointment_time: '10:00',
        payment_method: 'cash',
      };

      const response = await request(app)
        .post('/api/appointments')
        .send(appointmentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.appointmentId).toBeDefined();
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.paymentStatus).toBe('pending');

      createdAppointmentId = response.body.data.appointmentId;
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        patient_name: 'Test Patient',
        // Missing other required fields
      };

      const response = await request(app)
        .post('/api/appointments')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid email format', async () => {
      const invalidData = {
        patient_name: 'Test Patient',
        patient_email: 'invalid-email',
        patient_phone: '+1234567890',
        dentist_email: testDentistEmail,
        reason: 'Checkup',
        appointment_date: '2025-12-01',
        appointment_time: '10:00',
        payment_method: 'cash',
      };

      const response = await request(app)
        .post('/api/appointments')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for past appointment date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const invalidData = {
        patient_name: 'Test Patient',
        patient_email: testPatientEmail,
        patient_phone: '+1234567890',
        dentist_email: testDentistEmail,
        reason: 'Checkup',
        appointment_date: pastDate.toISOString().split('T')[0],
        appointment_time: '10:00',
        payment_method: 'cash',
      };

      const response = await request(app)
        .post('/api/appointments')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 when slot is already booked', async () => {
      const appointmentData = {
        patient_name: 'First Patient',
        patient_email: testPatientEmail,
        patient_phone: '+1234567890',
        dentist_email: testDentistEmail,
        dentist_id: testDentistId,
        reason: 'Checkup',
        appointment_date: '2025-12-15',
        appointment_time: '14:00',
        payment_method: 'cash',
      };

      // Create first appointment
      const response1 = await request(app)
        .post('/api/appointments')
        .send(appointmentData)
        .expect(201);

      createdAppointmentId = response1.body.data.appointmentId;

      // Try to book same slot
      const response2 = await request(app)
        .post('/api/appointments')
        .send({
          ...appointmentData,
          patient_name: 'Second Patient',
          patient_email: 'another@example.com',
        })
        .expect(409);

      expect(response2.body.success).toBe(false);
      expect(response2.body.error.code).toBe('SLOT_UNAVAILABLE');
      expect(response2.body.error.details).toBeDefined();
      expect(response2.body.error.details.alternativeSlots).toBeDefined();
    });
  });

  describe('GET /api/appointments/dentist/:dentistEmail', () => {
    beforeEach(async () => {
      // Create test appointment
      const { data } = await supabase
        .from('appointments')
        .insert({
          patient_name: 'Test Patient',
          patient_email: testPatientEmail,
          patient_phone: '+1234567890',
          dentist_id: testDentistId,
          dentist_email: testDentistEmail,
          reason: 'Checkup',
          appointment_date: '2025-12-01',
          appointment_time: '10:00',
          payment_method: 'cash',
          payment_status: 'pending',
          status: 'pending',
        })
        .select()
        .single();

      createdAppointmentId = data?.id || '';
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/appointments/dentist/${testDentistEmail}`)
        .expect(401);
    });

    it('should return 403 when accessing another dentist appointments', async () => {
      // Generate token for different dentist
      const differentDentistToken = generateTestToken('different-dentist-id', 'different@example.com', 'dentist');
      
      const response = await request(app)
        .get(`/api/appointments/dentist/${testDentistEmail}`)
        .set('Authorization', `Bearer ${differentDentistToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 400 for invalid email format', async () => {
      const dentistToken = generateTestToken(testDentistId, testDentistEmail, 'dentist');
      
      const response = await request(app)
        .get('/api/appointments/dentist/invalid-email')
        .set('Authorization', `Bearer ${dentistToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/appointments/patient/:email', () => {
    beforeEach(async () => {
      // Create test appointment
      const { data } = await supabase
        .from('appointments')
        .insert({
          patient_id: testPatientId,
          patient_name: 'Test Patient',
          patient_email: testPatientEmail,
          patient_phone: '+1234567890',
          dentist_id: testDentistId,
          dentist_email: testDentistEmail,
          reason: 'Checkup',
          appointment_date: '2025-12-01',
          appointment_time: '11:00',
          payment_method: 'cash',
          payment_status: 'pending',
          status: 'pending',
        })
        .select()
        .single();

      createdAppointmentId = data?.id || '';
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/appointments/patient/${testPatientEmail}`)
        .expect(401);
    });

    it('should return 403 when accessing another patient appointments', async () => {
      const differentPatientToken = generateTestToken('different-patient-id', 'different@example.com', 'patient');
      
      const response = await request(app)
        .get(`/api/appointments/patient/${testPatientEmail}`)
        .set('Authorization', `Bearer ${differentPatientToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 400 for invalid email format', async () => {
      const patientToken = generateTestToken(testPatientId, testPatientEmail, 'patient');
      
      const response = await request(app)
        .get('/api/appointments/patient/invalid-email')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/appointments/:id', () => {
    beforeEach(async () => {
      // Create test appointment
      const { data } = await supabase
        .from('appointments')
        .insert({
          patient_id: testPatientId,
          patient_name: 'Test Patient',
          patient_email: testPatientEmail,
          patient_phone: '+1234567890',
          dentist_id: testDentistId,
          dentist_email: testDentistEmail,
          reason: 'Checkup',
          appointment_date: '2025-12-01',
          appointment_time: '12:00',
          payment_method: 'cash',
          payment_status: 'pending',
          status: 'pending',
        })
        .select()
        .single();

      createdAppointmentId = data?.id || '';
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .put(`/api/appointments/${createdAppointmentId}`)
        .send({ notes: 'Updated notes' })
        .expect(401);
    });

    it('should return 404 for non-existent appointment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const patientToken = generateTestToken(testPatientId, testPatientEmail, 'patient');
      
      const response = await request(app)
        .put(`/api/appointments/${fakeId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ notes: 'Updated notes' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 when unauthorized user tries to update', async () => {
      const unauthorizedToken = generateTestToken('unauthorized-user-id', 'unauthorized@example.com', 'patient');
      
      const response = await request(app)
        .put(`/api/appointments/${createdAppointmentId}`)
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .send({ notes: 'Updated notes' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 400 when updating to past date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const patientToken = generateTestToken(testPatientId, testPatientEmail, 'patient');

      const response = await request(app)
        .put(`/api/appointments/${createdAppointmentId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          appointment_date: pastDate.toISOString().split('T')[0],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 when rescheduling to unavailable slot', async () => {
      const patientToken = generateTestToken(testPatientId, testPatientEmail, 'patient');
      
      // Create another appointment to block a slot
      const { data: blockingAppt } = await supabase
        .from('appointments')
        .insert({
          patient_name: 'Another Patient',
          patient_email: 'another@example.com',
          patient_phone: '+1234567890',
          dentist_id: testDentistId,
          dentist_email: testDentistEmail,
          reason: 'Checkup',
          appointment_date: '2025-12-02',
          appointment_time: '15:00',
          payment_method: 'cash',
          payment_status: 'pending',
          status: 'pending',
        })
        .select()
        .single();

      // Try to reschedule to the blocked slot
      const response = await request(app)
        .put(`/api/appointments/${createdAppointmentId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          appointment_date: '2025-12-02',
          appointment_time: '15:00',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SLOT_UNAVAILABLE');
      expect(response.body.error.details.alternativeSlots).toBeDefined();

      // Cleanup
      if (blockingAppt?.id) {
        await supabase.from('appointments').delete().eq('id', blockingAppt.id);
      }
    });
  });

  describe('DELETE /api/appointments/:id', () => {
    beforeEach(async () => {
      // Create test appointment
      const { data } = await supabase
        .from('appointments')
        .insert({
          patient_id: testPatientId,
          patient_name: 'Test Patient',
          patient_email: testPatientEmail,
          patient_phone: '+1234567890',
          dentist_id: testDentistId,
          dentist_email: testDentistEmail,
          reason: 'Checkup',
          appointment_date: '2025-12-01',
          appointment_time: '13:00',
          payment_method: 'cash',
          payment_status: 'pending',
          status: 'pending',
        })
        .select()
        .single();

      createdAppointmentId = data?.id || '';
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .delete(`/api/appointments/${createdAppointmentId}`)
        .expect(401);
    });

    it('should return 404 for non-existent appointment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const patientToken = generateTestToken(testPatientId, testPatientEmail, 'patient');
      
      const response = await request(app)
        .delete(`/api/appointments/${fakeId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 when unauthorized user tries to cancel', async () => {
      const unauthorizedToken = generateTestToken('unauthorized-user-id', 'unauthorized@example.com', 'patient');
      
      const response = await request(app)
        .delete(`/api/appointments/${createdAppointmentId}`)
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });
});
