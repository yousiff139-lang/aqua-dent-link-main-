import { useState, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { appointmentService, CreateCheckoutSessionDTO } from '@/services/appointmentService';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export interface StripeCheckoutOptions {
  appointmentId: string;
  amount: number; // in cents
  currency?: string;
  dentistName: string;
  patientEmail: string;
  appointmentDate: string;
  appointmentTime: string;
}

export interface UseStripeCheckoutReturn {
  initiateCheckout: (options: StripeCheckoutOptions) => Promise<void>;
  isProcessing: boolean;
  error: string | null;
  clearError: () => void;
}

export function useStripeCheckout(): UseStripeCheckoutReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const initiateCheckout = useCallback(async (options: StripeCheckoutOptions) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Load Stripe
      const stripe = await stripePromise;
      
      if (!stripe) {
        throw new Error('Stripe failed to load. Please check your internet connection and try again.');
      }

      // Create checkout session
      const sessionData: CreateCheckoutSessionDTO = {
        appointmentId: options.appointmentId,
        amount: options.amount,
        currency: options.currency || 'usd',
        dentistName: options.dentistName,
        patientEmail: options.patientEmail,
        appointmentDate: options.appointmentDate,
        appointmentTime: options.appointmentTime,
      };

      const response = await appointmentService.createCheckoutSession(sessionData);

      if (!response.success || !response.data.url) {
        throw new Error('Failed to create payment session. Please try again.');
      }

      // Redirect to Stripe Checkout
      window.location.href = response.data.url;
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'An unexpected error occurred. Please try again.';
      
      setError(errorMessage);
      setIsProcessing(false);
      throw err;
    }
  }, []);

  return {
    initiateCheckout,
    isProcessing,
    error,
    clearError,
  };
}
