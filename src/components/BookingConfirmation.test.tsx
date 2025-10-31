import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingConfirmation } from './BookingConfirmation';
import { BrowserRouter } from 'react-router-dom';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              booking_reference: 'BK-20241027-A3F9K',
              appointment_date: '2025-11-15',
              appointment_time: '10:00',
              payment_method: 'cash',
              payment_status: 'pending',
            },
            error: null,
          })),
        })),
      })),
    })),
  },
}));

describe('BookingConfirmation', () => {
  const mockProps = {
    appointmentId: 'apt-123',
    dentistName: 'Dr. Smith',
    date: '2025-11-15',
    time: '10:00',
    paymentMethod: 'cash' as const,
    paymentStatus: 'pending' as const,
  };

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  it('renders confirmation message with appointment details', async () => {
    renderWithRouter(<BookingConfirmation {...mockProps} />);

    expect(screen.getByText(/Appointment Confirmed!/i)).toBeInTheDocument();
    expect(screen.getByText(/Dr. Smith/i)).toBeInTheDocument();
    
    // Wait for booking reference to load
    expect(await screen.findByText(/BK-20241027-A3F9K/i)).toBeInTheDocument();
  });

  it('displays formatted date and time', () => {
    renderWithRouter(<BookingConfirmation {...mockProps} />);

    // Date should be formatted as "Saturday, November 15, 2025"
    expect(screen.getByText(/November 15, 2025/i)).toBeInTheDocument();
    
    // Time should be formatted as "10:00 AM"
    expect(screen.getByText(/10:00 AM/i)).toBeInTheDocument();
  });

  it('shows cash payment reminder when payment is pending', () => {
    renderWithRouter(<BookingConfirmation {...mockProps} />);

    expect(screen.getByText(/Please remember to bring payment/i)).toBeInTheDocument();
    expect(screen.getByText(/Payment Pending/i)).toBeInTheDocument();
  });

  it('shows paid status for stripe payment', () => {
    const stripeProps = {
      ...mockProps,
      paymentMethod: 'stripe' as const,
      paymentStatus: 'paid' as const,
    };

    renderWithRouter(<BookingConfirmation {...stripeProps} />);

    expect(screen.getByText(/Paid/i)).toBeInTheDocument();
    expect(screen.getByText(/Your payment has been successfully processed/i)).toBeInTheDocument();
  });

  it('navigates to dashboard when clicking view in dashboard', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BookingConfirmation {...mockProps} />);

    const viewDashboardButton = await screen.findByRole('button', { name: /View in Dashboard/i });
    await user.click(viewDashboardButton);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('navigates to dentists page when clicking book another appointment', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BookingConfirmation {...mockProps} />);

    const bookAnotherButton = await screen.findByRole('button', { name: /Book Another Appointment/i });
    await user.click(bookAnotherButton);

    expect(mockNavigate).toHaveBeenCalledWith('/dentists');
  });

  it('navigates to home when clicking return home', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BookingConfirmation {...mockProps} />);

    const returnHomeButton = await screen.findByRole('button', { name: /Return to Home/i });
    await user.click(returnHomeButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('displays payment method correctly', () => {
    renderWithRouter(<BookingConfirmation {...mockProps} />);

    expect(screen.getByText(/Cash Payment/i)).toBeInTheDocument();
  });

  it('displays credit card payment method for stripe', () => {
    const stripeProps = {
      ...mockProps,
      paymentMethod: 'stripe' as const,
      paymentStatus: 'paid' as const,
    };

    renderWithRouter(<BookingConfirmation {...stripeProps} />);

    expect(screen.getByText(/Credit\/Debit Card/i)).toBeInTheDocument();
  });
});
