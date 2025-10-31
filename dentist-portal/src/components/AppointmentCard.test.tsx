import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppointmentCard } from './AppointmentCard';
import { Appointment } from '@/types';

describe('AppointmentCard', () => {
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

  const mockHandlers = {
    onMarkComplete: vi.fn(),
    onReschedule: vi.fn(),
  };

  it('renders appointment details', () => {
    render(<AppointmentCard appointment={mockAppointment} {...mockHandlers} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Regular checkup/i)).toBeInTheDocument();
  });

  it('displays formatted date and time', () => {
    render(<AppointmentCard appointment={mockAppointment} {...mockHandlers} />);

    // Date is formatted as "Saturday, Nov 15, 2025"
    expect(screen.getByText(/Nov 15, 2025/i)).toBeInTheDocument();
    expect(screen.getByText(/10:00 AM/i)).toBeInTheDocument();
  });

  it('displays payment status badge', () => {
    render(<AppointmentCard appointment={mockAppointment} {...mockHandlers} />);

    const badges = screen.getAllByText('Pending');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('displays appointment status badge', () => {
    render(<AppointmentCard appointment={mockAppointment} {...mockHandlers} />);

    const badges = screen.getAllByText('Pending');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('formats phone number correctly', () => {
    render(<AppointmentCard appointment={mockAppointment} {...mockHandlers} />);

    expect(screen.getByText('(123) 456-7890')).toBeInTheDocument();
  });

  it('shows mark complete button for pending appointments', () => {
    // Set appointment date to past
    const pastAppointment = {
      ...mockAppointment,
      appointment_date: '2025-10-20',
    };

    render(<AppointmentCard appointment={pastAppointment} {...mockHandlers} />);

    expect(screen.getByRole('button', { name: /Mark Complete/i })).toBeInTheDocument();
  });

  it('shows reschedule button for non-completed appointments', () => {
    render(<AppointmentCard appointment={mockAppointment} {...mockHandlers} />);

    expect(screen.getByRole('button', { name: /Reschedule/i })).toBeInTheDocument();
  });

  it('calls onMarkComplete when mark complete button is clicked', async () => {
    const user = userEvent.setup();
    const pastAppointment = {
      ...mockAppointment,
      appointment_date: '2025-10-20',
    };

    render(<AppointmentCard appointment={pastAppointment} {...mockHandlers} />);

    const markCompleteButton = screen.getByRole('button', { name: /Mark Complete/i });
    await user.click(markCompleteButton);

    expect(mockHandlers.onMarkComplete).toHaveBeenCalledWith(pastAppointment);
  });

  it('calls onReschedule when reschedule button is clicked', async () => {
    const user = userEvent.setup();
    render(<AppointmentCard appointment={mockAppointment} {...mockHandlers} />);

    const rescheduleButton = screen.getByRole('button', { name: /Reschedule/i });
    await user.click(rescheduleButton);

    expect(mockHandlers.onReschedule).toHaveBeenCalledWith(mockAppointment);
  });

  it('displays completed appointment with different styling', () => {
    const completedAppointment = {
      ...mockAppointment,
      status: 'completed' as const,
    };

    render(<AppointmentCard appointment={completedAppointment} {...mockHandlers} />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mark Complete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reschedule/i })).not.toBeInTheDocument();
  });

  it('displays paid payment status', () => {
    const paidAppointment = {
      ...mockAppointment,
      payment_method: 'stripe',
      payment_status: 'paid',
    };

    render(<AppointmentCard appointment={paidAppointment} {...mockHandlers} />);

    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('displays notes when present', () => {
    const appointmentWithNotes = {
      ...mockAppointment,
      notes: 'Patient has dental anxiety',
    };

    render(<AppointmentCard appointment={appointmentWithNotes} {...mockHandlers} />);

    expect(screen.getByText(/Patient has dental anxiety/i)).toBeInTheDocument();
  });

  it('disables buttons when processing', () => {
    const pastAppointment = {
      ...mockAppointment,
      appointment_date: '2025-10-20',
    };

    render(<AppointmentCard appointment={pastAppointment} {...mockHandlers} isProcessing={true} />);

    const markCompleteButton = screen.getByRole('button', { name: /Mark Complete/i });
    const rescheduleButton = screen.getByRole('button', { name: /Reschedule/i });

    expect(markCompleteButton).toBeDisabled();
    expect(rescheduleButton).toBeDisabled();
  });

  it('shows clickable email link', () => {
    render(<AppointmentCard appointment={mockAppointment} {...mockHandlers} />);

    const emailLink = screen.getByRole('link', { name: /john@example.com/i });
    expect(emailLink).toHaveAttribute('href', 'mailto:john@example.com');
  });

  it('shows clickable phone link', () => {
    render(<AppointmentCard appointment={mockAppointment} {...mockHandlers} />);

    const phoneLink = screen.getByRole('link', { name: /\(123\) 456-7890/i });
    expect(phoneLink).toHaveAttribute('href', 'tel:1234567890');
  });
});
