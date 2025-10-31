import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, FileText, AlertCircle } from "lucide-react";
import { formatBookingReference } from "@/lib/bookingReference";

export interface Appointment {
  id: string;
  patient_name: string;
  patient_email: string;
  patient_phone?: string;
  dentist_id?: string;
  dentist_name?: string;
  appointment_date: string;
  appointment_time: string;
  appointment_type?: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  symptoms?: string;
  chief_complaint?: string;
  cause_identified?: boolean;
  uncertainty_note?: string;
  medical_history?: string;
  notes?: string;
  booking_reference?: string;
  documents?: any[];
  cancellation_reason?: string;
  cancelled_at?: string;
  created_at: string;
}

interface AppointmentsListProps {
  appointments: Appointment[];
  loading?: boolean;
  onCancelAppointment?: (appointmentId: string) => void;
  showCancelButton?: boolean;
}

export const AppointmentsList = ({
  appointments,
  loading = false,
  onCancelAppointment,
  showCancelButton = true,
}: AppointmentsListProps) => {
  if (loading) {
    return (
      <Card className="gradient-card p-6 border-border/50">
        <p className="text-muted-foreground text-center">Loading appointments...</p>
      </Card>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card className="gradient-card p-6 border-border/50">
        <p className="text-muted-foreground text-center">No appointments found.</p>
      </Card>
    );
  }

  // Sort appointments by date (earliest first)
  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
    const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
    return dateA.getTime() - dateB.getTime();
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return (
          <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
            Upcoming
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-green-500/20">
            Completed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20">
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const canCancelAppointment = (appointment: Appointment): boolean => {
    if (appointment.status !== 'upcoming') return false;
    
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
    const now = new Date();
    const hoursDifference = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursDifference > 1;
  };

  const formatDateTime = (date: string, time: string) => {
    const dateObj = new Date(`${date}T${time}`);
    return {
      date: dateObj.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: dateObj.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
    };
  };

  return (
    <div className="space-y-4">
      {sortedAppointments.map((appointment) => {
        const { date, time } = formatDateTime(appointment.appointment_date, appointment.appointment_time);
        const canCancel = canCancelAppointment(appointment);

        return (
          <Card 
            key={appointment.id} 
            className="gradient-card p-6 border-border/50 hover:shadow-aqua-md transition-smooth"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="bg-gradient-primary p-3 rounded-xl flex-shrink-0">
                  <User className="w-5 h-5 text-primary-foreground" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {appointment.dentist_name || 'Dentist'}
                      </h3>
                      {appointment.appointment_type && (
                        <p className="text-sm text-muted-foreground">
                          {appointment.appointment_type}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(appointment.status)}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm mb-3">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-primary" />
                      {date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-primary" />
                      {time}
                    </span>
                  </div>

                  {appointment.symptoms && (
                    <div className="mb-2">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Symptoms:</span> {appointment.symptoms}
                      </p>
                    </div>
                  )}

                  {appointment.uncertainty_note && !appointment.cause_identified && (
                    <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-700">
                        {appointment.uncertainty_note}
                      </p>
                    </div>
                  )}

                  {appointment.documents && appointment.documents.length > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                      <FileText className="w-4 h-4" />
                      <span>{appointment.documents.length} document(s) attached</span>
                    </div>
                  )}

                  {appointment.booking_reference && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Booking Reference:</span>{' '}
                      <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono">
                        {formatBookingReference(appointment.booking_reference)}
                      </code>
                    </div>
                  )}

                  {appointment.status === 'cancelled' && appointment.cancellation_reason && (
                    <div className="mt-2 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Cancellation reason:</span>{' '}
                        {appointment.cancellation_reason}
                      </p>
                    </div>
                  )}

                  {appointment.notes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      <span className="font-medium">Notes:</span> {appointment.notes}
                    </p>
                  )}
                </div>
              </div>

              {showCancelButton && appointment.status === 'upcoming' && onCancelAppointment && (
                <div className="flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className={
                      canCancel
                        ? "border-destructive/20 text-destructive hover:bg-destructive/10"
                        : "opacity-50 cursor-not-allowed"
                    }
                    onClick={() => canCancel && onCancelAppointment(appointment.id)}
                    disabled={!canCancel}
                    title={
                      canCancel
                        ? "Cancel appointment"
                        : "Cannot cancel within 1 hour of appointment"
                    }
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
