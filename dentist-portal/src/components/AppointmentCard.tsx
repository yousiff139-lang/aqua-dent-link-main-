import { Appointment, AppointmentStatus } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, CreditCard, CheckCircle, CalendarClock, Mail, Phone, FileText, Download } from 'lucide-react';
import { format, parseISO, isFuture } from 'date-fns';

interface AppointmentCardProps {
  appointment: Appointment;
  onMarkComplete: (appointment: Appointment) => void;
  onReschedule: (appointment: Appointment) => void;
  isProcessing?: boolean;
}

export const AppointmentCard = ({
  appointment,
  onMarkComplete,
  onReschedule,
  isProcessing = false,
}: AppointmentCardProps) => {
  // Get status badge variant
  const getStatusBadge = (status: AppointmentStatus) => {
    const variants: Record<AppointmentStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      confirmed: { variant: 'default', label: 'Confirmed' },
      completed: { variant: 'outline', label: 'Completed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
    };
    return variants[status];
  };

  // Get payment status badge
  const getPaymentStatusBadge = (paymentStatus: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; color: string }> = {
      pending: { variant: 'secondary', label: 'Pending', color: 'text-yellow-600' },
      paid: { variant: 'default', label: 'Paid', color: 'text-green-600' },
      failed: { variant: 'destructive', label: 'Failed', color: 'text-red-600' },
    };
    return variants[paymentStatus] || { variant: 'outline', label: paymentStatus, color: 'text-gray-600' };
  };

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'EEEE, MMM dd, yyyy');
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

  // Format phone number for display
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Check if appointment is in the future
  const isAppointmentFuture = () => {
    try {
      const appointmentDate = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
      return isFuture(appointmentDate);
    } catch {
      return false;
    }
  };

  const statusBadge = getStatusBadge(appointment.status);
  const paymentBadge = getPaymentStatusBadge(appointment.payment_status);
  const isFutureAppointment = isAppointmentFuture();
  const canMarkComplete = (appointment.status === 'pending' || appointment.status === 'confirmed') && !isFutureAppointment;
  const canReschedule = appointment.status !== 'completed' && appointment.status !== 'cancelled';
  const isCompleted = appointment.status === 'completed';

  return (
    <Card 
      className={`
        transition-all duration-200 hover:shadow-md
        ${isCompleted ? 'bg-muted/30 border-muted' : 'hover:border-primary/50'}
      `}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header: Status and Payment */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={statusBadge.variant} className="text-sm">
                {statusBadge.label}
              </Badge>
              {isCompleted && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className={`h-4 w-4 ${paymentBadge.color}`} />
              <Badge variant={paymentBadge.variant} className="text-xs">
                {paymentBadge.label}
              </Badge>
            </div>
          </div>

          {/* Patient Information - Prominent */}
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg mb-2">{appointment.patient_name}</h3>
                <div className="space-y-1">
                  <a
                    href={`mailto:${appointment.patient_email}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
                    title={`Email ${appointment.patient_email}`}
                  >
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate group-hover:underline">{appointment.patient_email}</span>
                  </a>
                  {appointment.patient_phone && (
                    <a
                      href={`tel:${appointment.patient_phone}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
                      title={`Call ${appointment.patient_phone}`}
                    >
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span className="group-hover:underline">{formatPhoneNumber(appointment.patient_phone)}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium">{formatDate(appointment.appointment_date)}</p>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-2">
                <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="font-medium">{formatTime(appointment.appointment_time)}</p>
              </div>
            </div>
          </div>

          {/* Reason for Visit */}
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Reason for Visit</p>
              <p className="text-sm">{appointment.reason}</p>
            </div>
          </div>

          {/* Payment Method */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Payment Method:</span>
            <span className="font-medium capitalize">{appointment.payment_method}</span>
            {appointment.payment_method === 'cash' && appointment.payment_status === 'pending' && (
              <Badge variant="outline" className="text-xs ml-2">
                Pay at appointment
              </Badge>
            )}
          </div>

          {/* Notes (if any) */}
          {appointment.notes && (
            <div className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-3">
              <span className="font-medium">Notes: </span>
              {appointment.notes}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {canMarkComplete && (
              <Button
                size="sm"
                onClick={() => onMarkComplete(appointment)}
                disabled={isProcessing}
                className="flex-1 transition-all hover:scale-105"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Complete
              </Button>
            )}
            {canReschedule && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReschedule(appointment)}
                disabled={isProcessing}
                className="flex-1 transition-all hover:scale-105"
              >
                <CalendarClock className="h-4 w-4 mr-2" />
                Reschedule
              </Button>
            )}
            {appointment.pdf_report_url && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(appointment.pdf_report_url, '_blank')}
                className="flex-1 transition-all hover:scale-105"
                title="Download PDF Report"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF Report
              </Button>
            )}
            {!canMarkComplete && !canReschedule && !appointment.pdf_report_url && (
              <div className="flex-1 text-center text-sm text-muted-foreground py-2">
                No actions available
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
