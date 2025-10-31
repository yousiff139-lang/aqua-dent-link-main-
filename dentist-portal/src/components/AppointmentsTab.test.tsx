import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppointmentsTab from './AppointmentsTab';
import { useAuth } from '@/hooks/useAuth';
import { useAppointments } from '@/hooks/useAppointments';
import { appointmentService } from '@/services/appointment.service';

// Mock dependencies
vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useAppointments');
vi.mock('@/services/appointment.service');
vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AppointmentsTab', () => {
  const mockDentist = {
    id: 'dentist-123',
    email: 'dr.smith@dental.com',
    name: 'Dr. Smith',
  };

  const mockAppointments = [
    {
      id: 'apt-1',
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
    },
    {
      id: 'apt-2',
      patient_name: 'Jane Smith',
      patient_email: 'jane@example.com',
      patient_phone: '9876543210',
      dentist_email: 'dr.smith@dental.com',
      reason: 'Tooth pain',
      appointment_date: '2025-11-16',
      appointment_time: '14:00',
      payment_method: 'stripe',
      payment_status: 'paid',
      status: 'confirmed',
      notes: null,
      created_at: '2025-10-25T11:00:00Z',
      updated_at: '2025-10-25T11:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      dentist: mockDentist,
      isLoading: false,
      error: null,
    } as any);
  });

  it('renders loading state', () => {
    vi.mocked(useAppointments).mockReturnValue({
      appointments: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<AppointmentsTab />);

    expect(screen.getByText(/Loading appointments.../i)).toBeInTheDocument();
  });

  it('renders error state', () => {
    const mockRefetch = vi.fn();
    vi.mocked(useAppointments).mockReturnValue({
      appointments: [],
      isLoading: false,
      error: 'Failed to load appointments',
      refetch: mockRefetch,
    } as any);

    render(<AppointmentsTab />);

    expect(screen.getByText(/Failed to Load Appointments/i)).toBeInTheDocument();
  });

  it('renders empty state when no appointments', () => {
    vi.mocked(useAppointments).mockReturnValue({
      appointments: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<AppointmentsTab />);

    expect(screen.getByText(/No appointments yet/i)).toBeInTheDocument();
  });

  it('renders appointments list', () => {
    vi.mocked(useAppointments).mockReturnValue({
      appointments: mockAppointments,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<AppointmentsTab />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('filters appointments by status', async () => {
    const user = userEvent.setup();
    vi.mocked(useAppointments).mockReturnValue({
      appointments: mockAppointments,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<AppointmentsTab />);

    // Click pending filter
    const pendingButton = screen.getByRole('button', { name: /Pending \(1\)/i });
    await user.click(pendingButton);

    // Should show only pending appointment
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  it('toggles between card and table view', async () => {
    const user = userEvent.setup();
    vi.mocked(useAppointments).mockReturnValue({
      appointments: mockAppointments,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<AppointmentsTab />);

    // Default is card view
    expect(screen.getAllByText('John Doe')).toHaveLength(1);

    // Switch to table view
    const tableViewButton = screen.getByRole('button', { name: /Table view/i });
    await user.click(tableViewButton);

    // Should still show appointments
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('handles mark complete action', async () => {
    const user = userEvent.setup();
    const mockRefetch = vi.fn();
    const mockMarkComplete = vi.fn().mockResolvedValue({});
    vi.mocked(appointmentService.markComplete).mockImplementation(mockMarkComplete);
    
    vi.mocked(useAppointments).mockReturnValue({
      appointments: mockAppointments,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    render(<AppointmentsTab />);

    // Find and click mark complete button
    const completeButtons = screen.getAllByRole('button', { name: /Complete/i });
    await user.click(completeButtons[0]);

    // Confirm dialog should appear
    await waitFor(() => {
      expect(screen.getByText(/Mark Appointment as Completed/i)).toBeInTheDocument();
    });

    // Click confirm
    const confirmButton = screen.getByRole('button', { name: /Mark Complete/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockMarkComplete).toHaveBeenCalledWith('apt-1');
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('handles reschedule action', async () => {
    const user = userEvent.setup();
    const mockRefetch = vi.fn();
    const mockReschedule = vi.fn().mockResolvedValue({});
    vi.mocked(appointmentService.reschedule).mockImplementation(mockReschedule);
    
    vi.mocked(useAppointments).mockReturnValue({
      appointments: mockAppointments,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    render(<AppointmentsTab />);

    // Find and click reschedule button
    const rescheduleButtons = screen.getAllByRole('button', { name: /Reschedule/i });
    await user.click(rescheduleButtons[0]);

    // Reschedule dialog should appear
    await waitFor(() => {
      expect(screen.getByText(/Reschedule Appointment/i)).toBeInTheDocument();
    });
  });

  it('displays appointment count correctly', () => {
    vi.mocked(useAppointments).mockReturnValue({
      appointments: mockAppointments,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<AppointmentsTab />);

    expect(screen.getByText(/Showing 2 of 2 appointments/i)).toBeInTheDocument();
  });
});
