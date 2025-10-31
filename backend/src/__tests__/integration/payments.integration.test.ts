/**
 * Integration tests for Payments API endpoints
 * 
 * Tests the complete request/response cycle including:
 * - POST /api/payments/create-checkout-session - Create Stripe checkout session
 * - POST /api/payments/webhook - Handle Stripe webhooks
 * - GET /api/payments/appointment/:appointmentId - Get payment details
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { Application } from 'express';
import { supabase } from '../../config/supabase.js';
import { generateTestToken } from '../setup/auth-mock.js';
import Stripe from 'stripe';

// Mock Stripe
vi.mock('stripe', () => {
  const mockStripe = {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  };
  
  return {
    default: vi.fn(() => mockStripe),
  };
});

describe('Payments API Integration Tests', () => {
  let app: Application;
  let testDentistEmail: string;
  let testPatientEmail: string;
  let testDentistId: string;
  let testPatientId: string;
  let testAppointmentId: string;
  let mockStripe: any;

  beforeAll(async () => {
    app = createApp();
    
    // Get mocked Stripe instance
    const StripeConstructor = (await import('stripe')).default;
    mockStripe = new StripeConstructor('test_key', { apiVersion: '2024-12-18.acacia' });
    
    // Create unique test emails
    const timestamp = Date.now();
    testDentistEmail = `test-dentist-pay-${timestamp}@example.com`;
    testPatientEmail = `test-patient-pay-${timestamp}@example.com`;

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
    if (testAppointmentId) {
      await supabase.from('payment_transactions').delete().eq('appointment_id', testAppointmentId);
      await supabase.from('appointments').delete().eq('id', testAppointmentId);
    }
    
    await supabase.from('appointments').delete().eq('dentist_email', testDentistEmail);
    await supabase.from('dentists').delete().eq('id', testDentistId);
    await supabase.from('profiles').delete().eq('email', testDentistEmail);
    await supabase.from('profiles').delete().eq('email', testPatientEmail);
  });

  beforeEach(async () => {
    // Create test appointment before each test
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
        appointment_time: '10:00',
        payment_method: 'stripe',
        payment_status: 'pending',
        status: 'pending',
      })
      .select()
      .single();

    testAppointmentId = data?.id || '';
    
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup after each test
    if (testAppointmentId) {
      await supabase.from('payment_transactions').delete().eq('appointment_id', testAppointmentId);
      await supabase.from('appointments').delete().eq('id', testAppointmentId);
    }
  });

  describe('POST /api/payments/create-checkout-session', () => {
    it('should create checkout session with valid data', async () => {
      // Mock Stripe response
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      };
      
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const checkoutData = {
        appointmentId: testAppointmentId,
        amount: 10000, // $100.00
        currency: 'usd',
        dentistName: 'Dr. Test',
        patientEmail: testPatientEmail,
        patientName: 'Test Patient',
        appointmentDate: '2025-12-01',
        appointmentTime: '10:00',
      };

      const response = await request(app)
        .post('/api/payments/create-checkout-session')
        .send(checkoutData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.sessionId).toBe(mockSession.id);
      expect(response.body.data.url).toBe(mockSession.url);
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        appointmentId: testAppointmentId,
        // Missing other required fields
      };

      const response = await request(app)
        .post('/api/payments/create-checkout-session')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid appointment ID format', async () => {
      const invalidData = {
        appointmentId: 'invalid-uuid',
        amount: 10000,
        currency: 'usd',
        dentistName: 'Dr. Test',
        patientEmail: testPatientEmail,
        patientName: 'Test Patient',
        appointmentDate: '2025-12-01',
        appointmentTime: '10:00',
      };

      const response = await request(app)
        .post('/api/payments/create-checkout-session')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid amount', async () => {
      const invalidData = {
        appointmentId: testAppointmentId,
        amount: -100, // Negative amount
        currency: 'usd',
        dentistName: 'Dr. Test',
        patientEmail: testPatientEmail,
        patientName: 'Test Patient',
        appointmentDate: '2025-12-01',
        appointmentTime: '10:00',
      };

      const response = await request(app)
        .post('/api/payments/create-checkout-session')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid email format', async () => {
      const invalidData = {
        appointmentId: testAppointmentId,
        amount: 10000,
        currency: 'usd',
        dentistName: 'Dr. Test',
        patientEmail: 'invalid-email',
        patientName: 'Test Patient',
        appointmentDate: '2025-12-01',
        appointmentTime: '10:00',
      };

      const response = await request(app)
        .post('/api/payments/create-checkout-session')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle Stripe API errors', async () => {
      // Mock Stripe error
      mockStripe.checkout.sessions.create.mockRejectedValue(
        new Error('Stripe API error')
      );

      const checkoutData = {
        appointmentId: testAppointmentId,
        amount: 10000,
        currency: 'usd',
        dentistName: 'Dr. Test',
        patientEmail: testPatientEmail,
        patientName: 'Test Patient',
        appointmentDate: '2025-12-01',
        appointmentTime: '10:00',
      };

      const response = await request(app)
        .post('/api/payments/create-checkout-session')
        .send(checkoutData)
        .expect(402);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PAYMENT_ERROR');
    });
  });

  describe('POST /api/payments/webhook', () => {
    it('should return 400 for missing Stripe signature', async () => {
      const response = await request(app)
        .post('/api/payments/webhook')
        .send({ type: 'checkout.session.completed' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle checkout.session.completed event', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            payment_intent: 'pi_test_123',
            payment_status: 'paid',
            metadata: {
              appointmentId: testAppointmentId,
            },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'test_signature')
        .send(JSON.stringify(mockEvent))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Webhook received');

      // Verify appointment payment status was updated
      const { data: appointment } = await supabase
        .from('appointments')
        .select('payment_status')
        .eq('id', testAppointmentId)
        .single();

      expect(appointment?.payment_status).toBe('paid');
    });

    it('should handle payment_intent.payment_failed event', async () => {
      const mockEvent = {
        id: 'evt_test_456',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_456',
            metadata: {
              appointmentId: testAppointmentId,
            },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'test_signature')
        .send(JSON.stringify(mockEvent))
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify appointment payment status was updated
      const { data: appointment } = await supabase
        .from('appointments')
        .select('payment_status')
        .eq('id', testAppointmentId)
        .single();

      expect(appointment?.payment_status).toBe('failed');
    });

    it('should handle invalid webhook signature', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'invalid_signature')
        .send(JSON.stringify({ type: 'test' }))
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle unknown event types gracefully', async () => {
      const mockEvent = {
        id: 'evt_test_789',
        type: 'unknown.event.type',
        data: {
          object: {},
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'test_signature')
        .send(JSON.stringify(mockEvent))
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/payments/appointment/:appointmentId', () => {
    beforeEach(async () => {
      // Create payment transaction
      await supabase
        .from('payment_transactions')
        .insert({
          appointment_id: testAppointmentId,
          stripe_session_id: 'cs_test_123',
          stripe_payment_intent_id: 'pi_test_123',
          amount: 10000,
          currency: 'usd',
          status: 'succeeded',
          payment_method: 'card',
        });
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/payments/appointment/${testAppointmentId}`)
        .expect(401);
    });

    it('should return payment details for authenticated user', async () => {
      const patientToken = generateTestToken(testPatientId, testPatientEmail, 'patient');
      
      const response = await request(app)
        .get(`/api/payments/appointment/${testAppointmentId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.appointment_id).toBe(testAppointmentId);
      expect(response.body.data.amount).toBe(10000);
      expect(response.body.data.status).toBe('succeeded');
    });

    it('should return 404 for non-existent payment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const patientToken = generateTestToken(testPatientId, testPatientEmail, 'patient');
      
      const response = await request(app)
        .get(`/api/payments/appointment/${fakeId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid appointment ID', async () => {
      const patientToken = generateTestToken(testPatientId, testPatientEmail, 'patient');
      
      const response = await request(app)
        .get('/api/payments/appointment/invalid-id')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
