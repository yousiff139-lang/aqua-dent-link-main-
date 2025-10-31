import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import {
  PaymentTransaction,
  CreatePaymentTransactionDTO,
  UpdatePaymentTransactionDTO,
} from '../types/index.js';
import { AppError } from '../utils/errors.js';

export class PaymentRepository {
  /**
   * Create payment transaction record
   */
  async create(data: CreatePaymentTransactionDTO): Promise<PaymentTransaction> {
    try {
      // Validate required fields
      if (!data.appointment_id) {
        throw AppError.validation('Appointment ID is required');
      }

      if (!data.amount || data.amount <= 0) {
        throw AppError.validation('Valid payment amount is required');
      }

      if (!data.currency) {
        throw AppError.validation('Currency is required');
      }

      if (!data.payment_method) {
        throw AppError.validation('Payment method is required');
      }

      const { data: transaction, error } = await supabase
        .from('payment_transactions')
        .insert({
          appointment_id: data.appointment_id,
          stripe_session_id: data.stripe_session_id || null,
          stripe_payment_intent_id: data.stripe_payment_intent_id || null,
          amount: data.amount,
          currency: data.currency,
          status: data.status || 'pending',
          payment_method: data.payment_method,
          error_message: data.error_message || null,
          metadata: data.metadata || null,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info('Payment transaction created', {
        transactionId: transaction.id,
        appointmentId: data.appointment_id,
        amount: data.amount,
        status: data.status,
      });

      return transaction as PaymentTransaction;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to create payment transaction', { data, error });
      throw AppError.internal('Failed to create payment transaction');
    }
  }

  /**
   * Update payment status
   */
  async updateStatus(
    id: string,
    data: UpdatePaymentTransactionDTO
  ): Promise<PaymentTransaction> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (data.status !== undefined) {
        updateData.status = data.status;
      }

      if (data.stripe_payment_intent_id !== undefined) {
        updateData.stripe_payment_intent_id = data.stripe_payment_intent_id;
      }

      if (data.error_message !== undefined) {
        updateData.error_message = data.error_message;
      }

      if (data.metadata !== undefined) {
        updateData.metadata = data.metadata;
      }

      const { data: transaction, error } = await supabase
        .from('payment_transactions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw AppError.notFound('Payment transaction not found');
        }
        throw error;
      }

      logger.info('Payment transaction updated', {
        transactionId: id,
        updates: data,
      });

      return transaction as PaymentTransaction;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to update payment transaction', { id, data, error });
      throw AppError.internal('Failed to update payment transaction');
    }
  }

  /**
   * Get payment details by appointment ID
   */
  async findByAppointmentId(appointmentId: string): Promise<PaymentTransaction | null> {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw error;
      }

      return data as PaymentTransaction;
    } catch (error) {
      logger.error('Failed to find payment by appointment ID', {
        appointmentId,
        error,
      });
      throw AppError.internal('Failed to fetch payment details');
    }
  }

  /**
   * Get payment by Stripe session ID
   */
  async findByStripeSessionId(sessionId: string): Promise<PaymentTransaction | null> {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('stripe_session_id', sessionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw error;
      }

      return data as PaymentTransaction;
    } catch (error) {
      logger.error('Failed to find payment by Stripe session ID', {
        sessionId,
        error,
      });
      throw AppError.internal('Failed to fetch payment details');
    }
  }

  /**
   * Find payment transaction by ID
   */
  async findById(id: string): Promise<PaymentTransaction | null> {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw error;
      }

      return data as PaymentTransaction;
    } catch (error) {
      logger.error('Failed to find payment transaction by ID', { id, error });
      throw AppError.internal('Failed to fetch payment transaction');
    }
  }

  /**
   * Get all payment transactions for an appointment (including retries)
   */
  async findAllByAppointmentId(appointmentId: string): Promise<PaymentTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data as PaymentTransaction[]) || [];
    } catch (error) {
      logger.error('Failed to find all payments by appointment ID', {
        appointmentId,
        error,
      });
      throw AppError.internal('Failed to fetch payment transactions');
    }
  }
}

// Export singleton instance
export const paymentRepository = new PaymentRepository();
