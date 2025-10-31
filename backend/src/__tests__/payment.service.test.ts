/**
 * Unit tests for PaymentService
 * 
 * Tests payment processing logic including:
 * - Creating Stripe checkout sessions
 * - Handling webhook events
 * - Updating payment status
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PaymentService } from '../services/payment.service.js';
import { appointmentsRepository } from '../repositories/appointments.repository.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import { AppError } from '../utils/errors.js';
import { CreateCheckoutSessionParams, Appointment, PaymentTransaction } from '../types/index.js';
import Stripe from 'stripe';

// Mock the repositories
vi.mock('../repositories/appointments.repository.js', () => ({
  appointmentsRepository: {
    findById: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../repositories/payment.repository.js', () => ({
  paymentRepository: {
    create: vi.fn(),
    findByAppointmentId: vi.fn(),
    updateStatus: vi.fn(),
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

// Mock environment config
vi.mock('../config/env.js', () => ({
  env: {
    STRIPE_SECRET_KEY: 'sk_test_123',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
    STRIPE_SUCCESS_URL: 'http://localhost:5174/booking-confirmation',
    STRIPE_CANCEL_URL: 'http://localhost:5174/booking-cancelled',
    CORS_ORIGIN: 'http://localhost:5174',
  },
}));

// Mock Stripe - define before the mock
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

// Get reference to mocked Stripe for test assertions
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

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(() => {
    service = new PaymentService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createCheckoutSession', () => {
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

    const validParams: CreateCheckoutSessionParams = {
      appointmentId: 'apt-123',
      amount: 10000, // $100.00
      currency: 'usd',
      dentistName: 'Dr. Smith',
      patientEmail: 'john@example.com',
      patientName: 'John Doe',
      appointmentDate: '2025-12-01',
      appointmentTime: '10:00',
    };

    it('should create checkout session with valid params', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
        payment_intent: 'pi_test_123',
      };

      vi.mocked(appointmentsRepository.findById).mockResolvedValue(mockAppointment);
      vi.mocked(mockStripe.checkout.sessions.create).mockResolvedValue(mockSession as any);
      vi.mocked(paymentRepository.create).mockResolvedValue({} as PaymentTransaction);
      vi.mocked(appointmentsRepository.update).mockResolvedValue(mockAppointment);

      const result = await service.createCheckoutSession(validParams);

      expect(result).toEqual({
        sessionId: mockSession.id,
        url: mockSession.url,
      });
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method_types: ['card'],
          mode: 'payment',
          customer_email: validParams.patientEmail,
          client_reference_id: validParams.appointmentId,
        })
      );
      expect(paymentRepository.create).toHaveBeenCalled();
      expect(appointmentsRepository.update).toHaveBeenCalledWith(validParams.appointmentId, {
        payment_status: 'pending',
      });
    });

    it('should throw not found error for non-existent appointment', async () => {
      vi.mocked(appointmentsRepository.findById).mockResolvedValue(null);

      await expect(service.createCheckoutSession(validParams)).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Appointment not found',
      });
    });

    it('should throw validation error if appointment already paid', async () => {
      const paidAppointment = { ...mockAppointment, payment_status: 'paid' as const };
      vi.mocked(appointmentsRepository.findById).mockResolvedValue(paidAppointment);

      await expect(service.createCheckoutSession(validParams)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Appointment has already been paid',
      });
    });

    it('should handle Stripe API errors', async () => {
      vi.mocked(appointmentsRepository.findById).mockResolvedValue(mockAppointment);
      vi.mocked(mockStripe.checkout.sessions.create).mockRejectedValue(
        new Error('Stripe API error')
      );

      await expect(service.createCheckoutSession(validParams)).rejects.toMatchObject({
        code: 'PAYMENT_ERROR',
        message: 'Failed to create payment session',
      });
    });
  });

  describe('handleWebhookEvent', () => {
    const mockPayload = JSON.stringify({ type: 'checkout.session.completed' });
    const mockSignature = 'test_signature';

    it('should process checkout.session.completed event', async () => {
      const mockEvent: Stripe.Event = {
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            metadata: { appointment_id: 'apt-123' },
            payment_intent: 'pi_test_123',
          } as Stripe.Checkout.Session,
        },
      } as Stripe.Event;

      vi.mocked(mockStripe.webhooks.constructEvent).mockReturnValue(mockEvent);
      vi.mocked(appointmentsRepository.update).mockResolvedValue({} as Appointment);
      vi.mocked(paymentRepository.findByAppointmentId).mockResolvedValue({
        id: 'pay-123',
      } as PaymentTransaction);
      vi.mocked(paymentRepository.updateStatus).mockResolvedValue({} as PaymentTransaction);

      await service.handleWebhookEvent(mockPayload, mockSignature);

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        mockPayload,
        mockSignature,
        'whsec_test_123'
      );
      expect(appointmentsRepository.update).toHaveBeenCalledWith('apt-123', {
        payment_status: 'paid',
      });
    });

    it('should process checkout.session.expired event', async () => {
      const mockEvent: Stripe.Event = {
        id: 'evt_124',
        type: 'checkout.session.expired',
        data: {
          object: {
            id: 'cs_test_124',
            metadata: { appointment_id: 'apt-124' },
          } as Stripe.Checkout.Session,
        },
      } as Stripe.Event;

      vi.mocked(mockStripe.webhooks.constructEvent).mockReturnValue(mockEvent);
      vi.mocked(appointmentsRepository.update).mockResolvedValue({} as Appointment);
      vi.mocked(paymentRepository.findByAppointmentId).mockResolvedValue({
        id: 'pay-124',
      } as PaymentTransaction);
      vi.mocked(paymentRepository.updateStatus).mockResolvedValue({} as PaymentTransaction);

      await service.handleWebhookEvent(mockPayload, mockSignature);

      expect(appointmentsRepository.update).toHaveBeenCalledWith('apt-124', {
        payment_status: 'failed',
      });
    });

    it('should throw validation error for invalid signature', async () => {
      vi.mocked(mockStripe.webhooks.constructEvent).mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(
        service.handleWebhookEvent(mockPayload, 'invalid_signature')
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Invalid webhook signature',
      });
    });

    it('should handle duplicate webhook events (idempotency)', async () => {
      const mockEvent: Stripe.Event = {
        id: 'evt_duplicate',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            metadata: { appointment_id: 'apt-123' },
            payment_intent: 'pi_test_123',
          } as Stripe.Checkout.Session,
        },
      } as Stripe.Event;

      vi.mocked(mockStripe.webhooks.constructEvent).mockReturnValue(mockEvent);
      vi.mocked(appointmentsRepository.update).mockResolvedValue({} as Appointment);
      vi.mocked(paymentRepository.findByAppointmentId).mockResolvedValue({
        id: 'pay-123',
      } as PaymentTransaction);
      vi.mocked(paymentRepository.updateStatus).mockResolvedValue({} as PaymentTransaction);

      // Process event first time
      await service.handleWebhookEvent(mockPayload, mockSignature);

      // Clear mocks
      vi.clearAllMocks();
      vi.mocked(mockStripe.webhooks.constructEvent).mockReturnValue(mockEvent);

      // Process same event again
      await service.handleWebhookEvent(mockPayload, mockSignature);

      // Should not process payment updates again
      expect(appointmentsRepository.update).not.toHaveBeenCalled();
    });

    it('should process payment_intent.succeeded event', async () => {
      const mockEvent: Stripe.Event = {
        id: 'evt_125',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_125',
            metadata: { appointment_id: 'apt-125' },
            amount: 10000,
          } as Stripe.PaymentIntent,
        },
      } as Stripe.Event;

      vi.mocked(mockStripe.webhooks.constructEvent).mockReturnValue(mockEvent);
      vi.mocked(appointmentsRepository.update).mockResolvedValue({} as Appointment);
      vi.mocked(paymentRepository.findByAppointmentId).mockResolvedValue({
        id: 'pay-125',
      } as PaymentTransaction);
      vi.mocked(paymentRepository.updateStatus).mockResolvedValue({} as PaymentTransaction);

      await service.handleWebhookEvent(mockPayload, mockSignature);

      expect(appointmentsRepository.update).toHaveBeenCalledWith('apt-125', {
        payment_status: 'paid',
      });
    });

    it('should process payment_intent.payment_failed event', async () => {
      const mockEvent: Stripe.Event = {
        id: 'evt_126',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_126',
            metadata: { appointment_id: 'apt-126' },
            last_payment_error: { message: 'Card declined' },
          } as Stripe.PaymentIntent,
        },
      } as Stripe.Event;

      vi.mocked(mockStripe.webhooks.constructEvent).mockReturnValue(mockEvent);
      vi.mocked(appointmentsRepository.update).mockResolvedValue({} as Appointment);
      vi.mocked(paymentRepository.findByAppointmentId).mockResolvedValue({
        id: 'pay-126',
      } as PaymentTransaction);
      vi.mocked(paymentRepository.updateStatus).mockResolvedValue({} as PaymentTransaction);

      await service.handleWebhookEvent(mockPayload, mockSignature);

      expect(appointmentsRepository.update).toHaveBeenCalledWith('apt-126', {
        payment_status: 'failed',
      });
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update payment status to paid', async () => {
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

      vi.mocked(appointmentsRepository.update).mockResolvedValue(mockAppointment);
      vi.mocked(paymentRepository.findByAppointmentId).mockResolvedValue({
        id: 'pay-123',
      } as PaymentTransaction);
      vi.mocked(paymentRepository.updateStatus).mockResolvedValue({} as PaymentTransaction);

      await service.updatePaymentStatus('apt-123', 'paid', {
        stripeSessionId: 'cs_test_123',
        stripePaymentIntentId: 'pi_test_123',
      });

      expect(appointmentsRepository.update).toHaveBeenCalledWith('apt-123', {
        payment_status: 'paid',
      });
      expect(paymentRepository.updateStatus).toHaveBeenCalledWith('pay-123', {
        status: 'succeeded',
        stripe_payment_intent_id: 'pi_test_123',
        error_message: undefined,
      });
    });

    it('should update payment status to failed with error message', async () => {
      vi.mocked(appointmentsRepository.update).mockResolvedValue({} as Appointment);
      vi.mocked(paymentRepository.findByAppointmentId).mockResolvedValue({
        id: 'pay-123',
      } as PaymentTransaction);
      vi.mocked(paymentRepository.updateStatus).mockResolvedValue({} as PaymentTransaction);

      await service.updatePaymentStatus('apt-123', 'failed', {
        errorMessage: 'Card declined',
      });

      expect(appointmentsRepository.update).toHaveBeenCalledWith('apt-123', {
        payment_status: 'failed',
      });
      expect(paymentRepository.updateStatus).toHaveBeenCalledWith('pay-123', {
        status: 'failed',
        stripe_payment_intent_id: undefined,
        error_message: 'Card declined',
      });
    });
  });

  describe('getPaymentDetails', () => {
    it('should return payment details for appointment', async () => {
      const mockPayment: PaymentTransaction = {
        id: 'pay-123',
        appointment_id: 'apt-123',
        stripe_session_id: 'cs_test_123',
        stripe_payment_intent_id: 'pi_test_123',
        amount: 10000,
        currency: 'usd',
        status: 'succeeded',
        payment_method: 'stripe',
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(paymentRepository.findByAppointmentId).mockResolvedValue(mockPayment);

      const result = await service.getPaymentDetails('apt-123');

      expect(result).toMatchObject({
        id: mockPayment.id,
        appointmentId: mockPayment.appointment_id,
        amount: mockPayment.amount,
        currency: mockPayment.currency,
        status: mockPayment.status,
      });
    });

    it('should return null for non-existent payment', async () => {
      vi.mocked(paymentRepository.findByAppointmentId).mockResolvedValue(null);

      const result = await service.getPaymentDetails('apt-999');

      expect(result).toBeNull();
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return true for valid signature', () => {
      const mockEvent: Stripe.Event = {
        id: 'evt_123',
        type: 'checkout.session.completed',
      } as Stripe.Event;

      vi.mocked(mockStripe.webhooks.constructEvent).mockReturnValue(mockEvent);

      const result = service.verifyWebhookSignature('payload', 'valid_signature');

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      vi.mocked(mockStripe.webhooks.constructEvent).mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const result = service.verifyWebhookSignature('payload', 'invalid_signature');

      expect(result).toBe(false);
    });
  });
});
