import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RescheduleDialog } from './RescheduleDialog';
import { Appointment } from '@/types';

// Mock the Dialog component to avoid portal issues in tests
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

describe('RescheduleDialog', () => {
  const mockAppointment: Appointment = {
    id: 'apt-123',
    patient_name: 'John Doe',
    patient_email: 'john@example.com',
    patient_phone: '1234567890',
    dentist_email: 'dr.smith@dental.com',
    reason: 'Regular checkup',
    appointment_date: '2025-11-15',
    appointment_time: '10:00',
    payment_method: 'cash',
    payment_status: 'pending',
    status: 'pending',
    notes: null,
    created_at: '2025-10-25T10:00:00Z',
    updated_at: '2025-10-25T10:00:00Z',
  };

  const mockProps = {
    open: true,
    onOpenChange: vi.fn(),
    appointment: mockAppointment,
    onConfirm: vi.fn(),
    isLoading: false,
  };

  it('renders dialog when open', () => {
    render(<RescheduleDialog {...mockProps} />);

    expect(screen.getByText(/Reschedule Appointment/i)).toBeInTheDocument();
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<RescheduleDialog {...mockProps} open={false} />);

    expect(screen.queryByText(/Reschedule Appointment/i)).not.toBeInTheDocument();
  });

  it('displays current appointment details', () => {
    render(<RescheduleDialog {...mockProps} />);

    expect(screen.getByText(/Current Appointment/i)).toBeInTheDocument();
    expect(screen.getByText('2025-11-15')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
  });

  it('has date and time input fields', () => {
    render(<RescheduleDialog {...mockProps} />);

    expect(screen.getByLabelText(/New Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/New Time/i)).toBeInTheDocument();
  });

  it('calls onConfirm with new date and time', async () => {
    const user = userEvent.setup();
    const mockOnConfirm = vi.fn().mockResolvedValue({});
    
    render(<RescheduleDialog {...mockProps} onConfirm={mockOnConfirm} />);

    const dateInput = screen.getByLabelText(/New Date/i);
    const timeInput = screen.getByLabelText(/New Time/i);

    await user.clear(dateInput);
    await user.type(dateInput, '2025-11-20');
    await user.clear(timeInput);
    await user.type(timeInput, '14:00');

    const rescheduleButton = screen.getByRole('button', { name: /Reschedule/i });
    await user.click(rescheduleButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith('2025-11-20', '14:00');
    });
  });

  it('validates that date is not in the past', async () => {
    const user = userEvent.setup();
    const mockOnConfirm = vi.fn();
    
    render(<RescheduleDialog {...mockProps} onConfirm={mockOnConfirm} />);

    const dateInput = screen.getByLabelText(/New Date/i);
    const timeInput = screen.getByLabelText(/New Time/i);

    await user.clear(dateInput);
    await user.type(dateInput, '2020-01-01');
    await user.clear(timeInput);
    await user.type(timeInput, '10:00');

    const rescheduleButton = screen.getByRole('button', { name: /Reschedule/i });
    await user.click(rescheduleButton);

    await waitFor(() => {
      expect(screen.getByText(/Cannot schedule appointments in the past/i)).toBeInTheDocument();
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  it('validates that date and time are provided', async () => {
    const user = userEvent.setup();
    const mockOnConfirm = vi.fn();
    
    render(<RescheduleDialog {...mockProps} onConfirm={mockOnConfirm} />);

    const dateInput = screen.getByLabelText(/New Date/i);
    await user.clear(dateInput);

    const rescheduleButton = screen.getByRole('button', { name: /Reschedule/i });
    await user.click(rescheduleButton);

    await waitFor(() => {
      expect(screen.getByText(/Please select both date and time/i)).toBeInTheDocument();
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  it('calls onOpenChange when cancel is clicked', async () => {
    const user = userEvent.setup();
    const mockOnOpenChange = vi.fn();
    
    render(<RescheduleDialog {...mockProps} onOpenChange={mockOnOpenChange} />);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables inputs and buttons when loading', () => {
    render(<RescheduleDialog {...mockProps} isLoading={true} />);

    const dateInput = screen.getByLabelText(/New Date/i);
    const timeInput = screen.getByLabelText(/New Time/i);
    const rescheduleButton = screen.getByRole('button', { name: /Rescheduling.../i });
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });

    expect(dateInput).toBeDisabled();
    expect(timeInput).toBeDisabled();
    expect(rescheduleButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('displays error message for slot unavailable', async () => {
    const user = userEvent.setup();
    const mockError = {
      response: {
        status: 409,
        data: {
          error: {
            details: {
              alternativeSlots: [
                { time: '11:00' },
                { time: '12:00' },
              ],
            },
          },
        },
      },
    };
    const mockOnConfirm = vi.fn().mockRejectedValue(mockError);
    
    render(<RescheduleDialog {...mockProps} onConfirm={mockOnConfirm} />);

    const dateInput = screen.getByLabelText(/New Date/i);
    const timeInput = screen.getByLabelText(/New Time/i);

    await user.clear(dateInput);
    await user.type(dateInput, '2025-11-20');
    await user.clear(timeInput);
    await user.type(timeInput, '14:00');

    const rescheduleButton = screen.getByRole('button', { name: /Reschedule/i });
    await user.click(rescheduleButton);

    await waitFor(() => {
      expect(screen.getByText(/This time slot is already booked/i)).toBeInTheDocument();
      expect(screen.getByText(/Available times:/i)).toBeInTheDocument();
    });
  });

  it('handles null appointment gracefully', () => {
    render(<RescheduleDialog {...mockProps} appointment={null} />);

    expect(screen.getByText(/Reschedule Appointment/i)).toBeInTheDocument();
  });

  it('sets minimum date to today', () => {
    render(<RescheduleDialog {...mockProps} />);

    const dateInput = screen.getByLabelText(/New Date/i) as HTMLInputElement;
    const today = new Date().toISOString().split('T')[0];
    
    expect(dateInput).toHaveAttribute('min', today);
  });
});
