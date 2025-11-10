import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BookingForm } from './BookingForm';
import { appointmentService } from '@/services/appointmentService';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';

// Mock dependencies
vi.mock('@/services/appointmentService');
vi.mock('@/hooks/useStripeCheckout');
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('BookingForm', () => {
  const mockProps = {
    dentistId: 'dentist-123',
    dentistName: 'Dr. Smith',
    dentistEmail: 'dr.smith@dental.com',
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useStripeCheckout).mockReturnValue({
      initiateCheckout: vi.fn(),
      isProcessing: false,
      error: null,
      clearError: vi.fn(),
    });
  });

  it('renders booking form with dentist name', () => {
    render(<BookingForm {...mockProps} />);

    expect(screen.getByText(/Book Appointment with Dr. Smith/i)).toBeInTheDocument();
  });

  it('renders all form fields', () => {
    render(<BookingForm {...mockProps} />);

    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Reason for Visit/i)).toBeInTheDocument();
  });

  it('renders payment method options', () => {
    render(<BookingForm {...mockProps} />);

    expect(screen.getByText(/Cash Payment/i)).toBeInTheDocument();
    expect(screen.getByText(/Credit\/Debit Card/i)).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<BookingForm {...mockProps} />);

    expect(screen.getByRole('button', { name: /Book Appointment/i })).toBeInTheDocument();
  });

  it('displays payment amount', () => {
    render(<BookingForm {...mockProps} />);

    expect(screen.getByText(/\$50\.00/i)).toBeInTheDocument();
  });

  it('shows stripe processing state', () => {
    vi.mocked(useStripeCheckout).mockReturnValue({
      initiateCheckout: vi.fn(),
      isProcessing: true,
      error: null,
      clearError: vi.fn(),
    });

    render(<BookingForm {...mockProps} />);

    const submitButton = screen.getByRole('button', { name: /Redirecting to payment.../i });
    expect(submitButton).toBeDisabled();
  });

  it('displays stripe error when present', () => {
    vi.mocked(useStripeCheckout).mockReturnValue({
      initiateCheckout: vi.fn(),
      isProcessing: false,
      error: 'Payment initialization failed',
      clearError: vi.fn(),
    });

    render(<BookingForm {...mockProps} />);

    expect(screen.getByText(/Payment initialization failed/i)).toBeInTheDocument();
  });
});
