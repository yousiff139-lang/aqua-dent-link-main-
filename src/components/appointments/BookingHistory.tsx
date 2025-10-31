import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, FileText, XCircle } from "lucide-react";
import { formatBookingReference } from "@/lib/bookingReference";
import { formatAppointmentDateTime } from "@/lib/appointmentUtils";

export interface HistoricalAppointment {
  id: string;
  patient_name: string;
  dentist_name?: string;
  appointment_date: string;
  appointment_time: string;
  appointment_type?: string;
  status: 'completed' | 'cancelled';
  symptoms?: string;
  notes?: string;
  booking_reference?: string;
  documents?: any[];
  cancellation_reason?: string;
  cancelled_at?: string;
  created_at: string;
}

interface BookingHistoryProps {
  appointments: HistoricalAppointment[];
  loading?: boolean;
}

export const BookingHistory = ({
  appointments,
  loading = false,
}: BookingHistoryProps) => {
  if (loading) {
    return (
      <Card className="gradient-card p-6 border-border/50">
        <p className="text-muted-foreground text-center">Loading history...</p>
      </Card>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card className="gradient-card p-6 border-border/50">
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No past appointments found.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your completed and cancelled appointments will appear here.
          </p>
        </div>
      </Card>
    );
  }

  // Sort appointments by date (most recent first)
  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
    const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
    return dateB.getTime() - dateA.getTime();
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-500/10 text-green-600 border border-green-500/20">
            <span className="flex items-center gap-1">
              Completed
            </span>
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-destructive/10 text-destructive border border-destructive/20">
            <span className="flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              Cancelled
            </span>
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

  return (
    <div className="space-y-4">
      {sortedAppointments.map((appointment) => {
        const { date, time } = formatAppointmentDateTime(
          appointment.appointment_date,
          appointment.appointment_time
        );

        return (
          <Card 
            key={appointment.id} 
            className="gradient-card p-6 border-border/50 hover:shadow-md transition-smooth opacity-90"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl flex-shrink-0 ${
                appointment.status === 'completed' 
                  ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20' 
                  : 'bg-muted'
              }`}>
                <User className={`w-5 h-5 ${
                  appointment.status === 'completed' 
                    ? 'text-green-600' 
                    : 'text-muted-foreground'
                }`} />
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
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {date}
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-4 h-4" />
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

                {appointment.documents && appointment.documents.length > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                    <FileText className="w-4 h-4" />
                    <span>{appointment.documents.length} document(s) attached</span>
                  </div>
                )}

                {appointment.booking_reference && (
                  <div className="text-sm text-muted-foreground mb-2">
                    <span className="font-medium">Booking Reference:</span>{' '}
                    <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono">
                      {formatBookingReference(appointment.booking_reference)}
                    </code>
                  </div>
                )}

                {appointment.status === 'cancelled' && (
                  <div className="mt-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                    <p className="text-sm font-medium text-destructive mb-1">
                      Cancelled on {appointment.cancelled_at 
                        ? new Date(appointment.cancelled_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'N/A'}
                    </p>
                    {appointment.cancellation_reason && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Reason:</span> {appointment.cancellation_reason}
                      </p>
                    )}
                  </div>
                )}

                {appointment.notes && (
                  <p className="text-sm text-muted-foreground mt-2">
                    <span className="font-medium">Notes:</span> {appointment.notes}
                  </p>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
