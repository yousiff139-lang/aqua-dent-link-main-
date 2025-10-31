import { PatientAppointment } from "@/types/admin";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Calendar, Clock, User, FileText, Paperclip } from "lucide-react";
import { format } from "date-fns";

interface AppointmentTableProps {
  appointments: PatientAppointment[];
  isLoading?: boolean;
}

export const AppointmentTable = ({ appointments, isLoading }: AppointmentTableProps) => {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No appointments found</p>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'completed':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-3">
      {appointments.map((appointment) => (
        <Card key={appointment.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Patient Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <h4 className="font-semibold truncate">{appointment.patient_name}</h4>
              </div>
              <p className="text-sm text-muted-foreground truncate">{appointment.patient_email}</p>
              
              {appointment.symptoms && (
                <div className="mt-2 flex items-start gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground line-clamp-2">{appointment.symptoms}</p>
                </div>
              )}
            </div>

            {/* Appointment Details */}
            <div className="flex flex-col gap-2 md:items-end">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{format(new Date(appointment.appointment_date), 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{format(new Date(appointment.appointment_date), 'hh:mm a')}</span>
              </div>
              <Badge className={getStatusColor(appointment.status)}>
                {appointment.status}
              </Badge>
              {appointment.documents && appointment.documents.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Paperclip className="w-3 h-3" />
                  <span>{appointment.documents.length} document(s)</span>
                </div>
              )}
            </div>
          </div>

          {/* Appointment Type */}
          <div className="mt-3 pt-3 border-t">
            <Badge variant="outline" className="text-xs">
              {appointment.appointment_type}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
};
