import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAppointments } from '@/hooks/useAppointments';
import { useRealtimeAppointments } from '@/hooks/useRealtimeSync';
import { Appointment, AppointmentStatus } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorDisplay } from '@/components/ui/error-display';
import { EmptyState } from '@/components/ui/empty-state';
import { Calendar, Clock, User, CreditCard, Filter, CheckCircle, CalendarClock, Mail, Phone, LayoutGrid, Table, Download, X } from 'lucide-react';
import { format, parseISO, isFuture } from 'date-fns';
import { toast } from 'sonner';
import { appointmentService } from '@/services/appointment.service';
import { RescheduleDialog } from './RescheduleDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { AppointmentCard } from './AppointmentCard';

const AppointmentsTab = () => {
  const { dentist } = useAuth();
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Debug logging
  console.log('👨‍⚕️ AppointmentsTab - Dentist:', dentist);
  console.log('📧 AppointmentsTab - Dentist Email:', dentist?.email);
  
  const { appointments, isLoading, error, refetch } = useAppointments(dentist?.email);

  // Set up enhanced real-time subscription for instant updates
  useRealtimeAppointments(
    dentist?.id,
    {
      onCreated: () => {
        refetch(); // Refetch to get full appointment data with relations
        toast.success('🆕 New appointment received!');
      },
      onUpdated: () => {
        refetch(); // Refetch to ensure data consistency
        toast.info('🔄 Appointment updated');
      },
      onDeleted: () => {
        refetch(); // Refetch to remove deleted appointment
        toast.warning('🗑️ Appointment cancelled');
      },
    }
  );

  // Filter and sort appointments
  const filteredAndSortedAppointments = useMemo(() => {
    let filtered = appointments;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((apt) => apt.status === statusFilter);
    }

    // Sort by date/time (upcoming first)
    return [...filtered].sort((a, b) => {
      const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
      const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
      return dateA.getTime() - dateB.getTime();
    });
  }, [appointments, statusFilter]);

  // Get status badge variant
  const getStatusBadge = (status: AppointmentStatus) => {
    const variants: Record<AppointmentStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      confirmed: { variant: 'default', label: 'Confirmed' },
      upcoming: { variant: 'default', label: 'Upcoming' },
      completed: { variant: 'outline', label: 'Completed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
    };
    return variants[status];
  };

  // Get payment status badge
  const getPaymentStatusBadge = (paymentStatus: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      paid: { variant: 'default', label: 'Paid' },
      failed: { variant: 'destructive', label: 'Failed' },
    };
    return variants[paymentStatus] || { variant: 'outline', label: paymentStatus };
  };

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };

  // Format time
  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  // Check if appointment is in the future
  const isAppointmentFuture = (appointment: Appointment) => {
    try {
      const appointmentDate = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
      return isFuture(appointmentDate);
    } catch {
      return false;
    }
  };

  // Handle mark as completed
  const handleMarkComplete = async (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setConfirmDialogOpen(true);
  };

  const confirmMarkComplete = async () => {
    if (!selectedAppointment) return;

    setIsProcessing(true);
    const loadingToast = toast.loading('Marking appointment as completed...');
    
    try {
      await appointmentService.markComplete(selectedAppointment.id);
      toast.success('Appointment marked as completed successfully', { id: loadingToast });
      setConfirmDialogOpen(false);
      setSelectedAppointment(null);
      await refetch();
    } catch (err: any) {
      let errorMessage = err.message || 'Failed to update appointment. Please try again.';
      
      // Handle specific error cases
      if (err.status === 401 || err.shouldRedirect) {
        errorMessage = 'Your session has expired. Please log in again.';
        toast.error(errorMessage, { id: loadingToast });
        // Small delay before redirect to show the error message
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
        return;
      }
      
      if (err.status === 403) {
        errorMessage = 'You are not authorized to complete this appointment.';
      }
      
      toast.error(errorMessage, { id: loadingToast });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle cancel appointment
  const handleCancel = async (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setCancelDialogOpen(true);
  };

  const confirmCancel = async () => {
    if (!selectedAppointment) return;

    setIsProcessing(true);
    const loadingToast = toast.loading('Cancelling appointment...');
    
    try {
      await appointmentService.cancel(selectedAppointment.id);
      toast.success('Appointment cancelled successfully', { id: loadingToast });
      setCancelDialogOpen(false);
      setSelectedAppointment(null);
      await refetch();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to cancel appointment. Please try again.';
      toast.error(errorMessage, { id: loadingToast });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle reschedule
  const handleReschedule = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleDialogOpen(true);
  };

  // Handle notes update
  const handleUpdateNotes = async (appointmentId: string, notes: string) => {
    try {
      await appointmentService.saveNotes(appointmentId, notes);
      await refetch(); // Refresh appointments to show updated notes
    } catch (error: any) {
      throw new Error(error.message || 'Failed to save notes');
    }
  };

  const confirmReschedule = async (date: string, time: string) => {
    if (!selectedAppointment) return;

    setIsProcessing(true);
    const loadingToast = toast.loading('Rescheduling appointment...');
    
    try {
      await appointmentService.reschedule(selectedAppointment.id, date, time);
      toast.success('Appointment rescheduled successfully', { id: loadingToast });
      setRescheduleDialogOpen(false);
      setSelectedAppointment(null);
      await refetch();
    } catch (err: any) {
      let errorMessage = 'Failed to reschedule appointment. Please try again.';
      
      // Check if this is a slot unavailable error with alternative slots
      if (err?.response?.status === 409 && err?.response?.data?.error?.details?.alternativeSlots) {
        const alternatives = err.response.data.error.details.alternativeSlots;
        const alternativeTimesText = alternatives
          .slice(0, 3)
          .map((slot: { time: string }) => {
            const displayTime = new Date(`2000-01-01T${slot.time}`).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });
            return displayTime;
          })
          .join(", ");
        
        errorMessage = `This time slot is already booked. Available times: ${alternativeTimesText}${alternatives.length > 3 ? " and more" : ""}. Please select a different time.`;
      } else if (err?.response?.data?.error?.message) {
        errorMessage = err.response.data.error.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage, { id: loadingToast });
      // Don't close the dialog so user can try a different time
    } finally {
      setIsProcessing(false);
    }
  };

  // Format phone number for display
  const formatPhoneNumber = (phone: string) => {
    // Simple formatting - can be enhanced based on requirements
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading appointments..." className="py-12" />;
  }

  if (error) {
    return (
      <ErrorDisplay
        title="Failed to Load Appointments"
        message={error}
        onRetry={() => refetch()}
      />
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={Calendar}
          title="No appointments yet"
          description="Appointments will appear here once patients book with you. Make sure your profile is complete and visible to patients."
        />
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-medium text-yellow-900 mb-2">🔍 Debug Info:</p>
          <p className="text-xs text-yellow-800">Logged in as: {dentist?.full_name}</p>
          <p className="text-xs text-yellow-800">Email: {dentist?.email}</p>
          <p className="text-xs text-yellow-800 mt-2">Check browser console (F12) for detailed logs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter and View Toggle */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            All ({appointments.length})
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('pending')}
          >
            Pending ({appointments.filter((a) => a.status === 'pending').length})
          </Button>
          <Button
            variant={statusFilter === 'confirmed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('confirmed')}
          >
            Confirmed ({appointments.filter((a) => a.status === 'confirmed').length})
          </Button>
          <Button
            variant={statusFilter === 'upcoming' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('upcoming')}
          >
            Upcoming ({appointments.filter((a) => a.status === 'upcoming').length})
          </Button>
          <Button
            variant={statusFilter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('completed')}
          >
            Completed ({appointments.filter((a) => a.status === 'completed').length})
          </Button>
          <Button
            variant={statusFilter === 'cancelled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('cancelled')}
          >
            Cancelled ({appointments.filter((a) => a.status === 'cancelled').length})
          </Button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'card' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('card')}
            title="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
            title="Table view"
          >
            <Table className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredAndSortedAppointments.length} of {appointments.length} appointments
      </p>

      {/* Empty filtered state */}
      {filteredAndSortedAppointments.length === 0 && (
        <EmptyState
          icon={Filter}
          title="No appointments match your filters"
          description="Try adjusting your filters to see more appointments."
        />
      )}

      {/* Appointments Display */}
      {filteredAndSortedAppointments.length > 0 && (
        <>
          {/* Card View */}
          {viewMode === 'card' && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {filteredAndSortedAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onMarkComplete={handleMarkComplete}
                  onReschedule={handleReschedule}
                  onCancel={handleCancel}
                  onUpdateNotes={handleUpdateNotes}
                  isProcessing={isProcessing}
                />
              ))}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium text-sm">Patient</th>
                        <th className="text-left p-4 font-medium text-sm">Date</th>
                        <th className="text-left p-4 font-medium text-sm">Time</th>
                        <th className="text-left p-4 font-medium text-sm">Reason</th>
                        <th className="text-left p-4 font-medium text-sm">Payment</th>
                        <th className="text-left p-4 font-medium text-sm">Status</th>
                        <th className="text-left p-4 font-medium text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedAppointments.map((appointment) => {
                        const statusBadge = getStatusBadge(appointment.status);
                        const paymentBadge = getPaymentStatusBadge(appointment.payment_status);
                        const isFutureAppointment = isAppointmentFuture(appointment);
                        const canMarkComplete = appointment.status === 'pending' || appointment.status === 'confirmed';
                        const canReschedule = appointment.status !== 'completed' && appointment.status !== 'cancelled';

                        return (
                          <tr
                            key={appointment.id}
                            className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-medium">{appointment.patient_name}</p>
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <a
                                      href={`mailto:${appointment.patient_email}`}
                                      className="hover:text-primary hover:underline flex items-center gap-1"
                                      title={`Email ${appointment.patient_email}`}
                                    >
                                      <Mail className="h-3 w-3" />
                                      <span className="truncate max-w-[150px]">{appointment.patient_email}</span>
                                    </a>
                                  </div>
                                  {appointment.patient_phone && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <a
                                        href={`tel:${appointment.patient_phone}`}
                                        className="hover:text-primary hover:underline flex items-center gap-1"
                                        title={`Call ${appointment.patient_phone}`}
                                      >
                                        <Phone className="h-3 w-3" />
                                        <span>{formatPhoneNumber(appointment.patient_phone)}</span>
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm whitespace-nowrap">
                                  {formatDate(appointment.appointment_date)}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm whitespace-nowrap">
                                  {formatTime(appointment.appointment_time)}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-sm max-w-xs truncate" title={appointment.reason}>
                                {appointment.reason}
                              </p>
                            </td>
                            <td className="p-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm capitalize">
                                    {appointment.payment_method}
                                  </span>
                                </div>
                                <Badge variant={paymentBadge.variant} className="text-xs">
                                  {paymentBadge.label}
                                </Badge>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant={statusBadge.variant}>
                                {statusBadge.label}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                {canMarkComplete && !isFutureAppointment && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleMarkComplete(appointment)}
                                    className="whitespace-nowrap"
                                    title="Mark as completed"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Complete
                                  </Button>
                                )}
                                {canReschedule && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleReschedule(appointment)}
                                    className="whitespace-nowrap"
                                    title="Reschedule appointment"
                                  >
                                    <CalendarClock className="h-4 w-4 mr-1" />
                                    Reschedule
                                  </Button>
                                )}
                                {canReschedule && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCancel(appointment)}
                                    className="whitespace-nowrap text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Cancel appointment"
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel
                                  </Button>
                                )}
                                {(appointment as any).pdf_report_url && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open((appointment as any).pdf_report_url, '_blank')}
                                    className="whitespace-nowrap"
                                    title="Download PDF Report"
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    PDF
                                  </Button>
                                )}
                                {!canMarkComplete && !canReschedule && !(appointment as any).pdf_report_url && (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
      
      {/* Reschedule Dialog */}
      <RescheduleDialog
        open={rescheduleDialogOpen}
        onOpenChange={setRescheduleDialogOpen}
        appointment={selectedAppointment}
        onConfirm={confirmReschedule}
        isLoading={isProcessing}
      />

      {/* Confirm Complete Dialog */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="Mark Appointment as Completed"
        description={`Are you sure you want to mark ${selectedAppointment?.patient_name}'s appointment as completed? This action cannot be undone.`}
        confirmLabel="Mark Complete"
        onConfirm={confirmMarkComplete}
        isLoading={isProcessing}
      />

      {/* Cancel Appointment Dialog */}
      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel Appointment"
        description={`Are you sure you want to cancel ${selectedAppointment?.patient_name}'s appointment? This action cannot be undone.`}
        confirmLabel="Cancel Appointment"
        onConfirm={confirmCancel}
        isLoading={isProcessing}
        variant="destructive"
      />
    </div>
  );
};

export default AppointmentsTab;
