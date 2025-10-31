import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { fetchDentistAppointments } from "@/lib/admin-queries";
import { DentistAppointment } from "@/types/admin";
import { 
  User, 
  Mail, 
  Calendar, 
  Clock, 
  Loader2, 
  AlertCircle,
  FileText,
  Users
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

interface PatientListProps {
  dentistId: string;
}

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

export const PatientList = ({ dentistId }: PatientListProps) => {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<DentistAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    loadAppointments();
  }, [dentistId]);

  const loadAppointments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchDentistAppointments(dentistId);
      setAppointments(data);
    } catch (err: any) {
      console.error('Error loading appointments:', err);
      const errorMessage = err.message || 'Failed to load appointments';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter appointments by status
  const filteredAppointments = useMemo(() => {
    if (statusFilter === 'all') {
      return appointments;
    }
    return appointments.filter(apt => apt.status === statusFilter);
  }, [appointments, statusFilter]);

  // Sort appointments by date (most recent first)
  const sortedAppointments = useMemo(() => {
    return [...filteredAppointments].sort((a, b) => {
      const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
      const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
      return dateB.getTime() - dateA.getTime();
    });
  }, [filteredAppointments]);

  // Get unique patient count
  const uniquePatientCount = useMemo(() => {
    const uniquePatients = new Set(appointments.map(apt => apt.patient_id));
    return uniquePatients.size;
  }, [appointments]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error Loading Appointments</h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <button
          onClick={loadAppointments}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filter and Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">
            Patient Appointments ({uniquePatientCount} unique patients)
          </h3>
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Appointments</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Appointments List */}
      {sortedAppointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
          <Calendar className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {statusFilter === 'all' 
              ? 'No Appointments Yet' 
              : `No ${statusFilter} Appointments`}
          </h3>
          <p className="text-sm text-muted-foreground">
            {statusFilter === 'all'
              ? 'This dentist has no appointments scheduled.'
              : `There are no ${statusFilter} appointments for this dentist.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAppointments.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))}
        </div>
      )}
    </div>
  );
};

// Appointment Card Component
interface AppointmentCardProps {
  appointment: DentistAppointment;
}

const AppointmentCard = ({ appointment }: AppointmentCardProps) => {
  const formattedDate = format(new Date(appointment.appointment_date), 'MMM dd, yyyy');
  const formattedTime = appointment.appointment_time;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          {/* Patient Info */}
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">{appointment.patient_name}</h4>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Mail className="w-3 h-3" />
                <span>{appointment.patient_email}</span>
              </div>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{formattedTime}</span>
            </div>
          </div>

          {/* Symptoms */}
          {appointment.symptoms && (
            <div className="flex items-start gap-2 text-sm">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground text-xs mb-1">Symptoms:</p>
                <p className="text-foreground">{appointment.symptoms}</p>
              </div>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <Badge 
          variant="outline" 
          className={`${getStatusColor(appointment.status)} capitalize`}
        >
          {appointment.status}
        </Badge>
      </div>
    </Card>
  );
};
