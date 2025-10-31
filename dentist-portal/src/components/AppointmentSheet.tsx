import { useState, useMemo } from 'react';
import { Appointment, AppointmentStatus } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  ArrowUpDown,
  FileText,
  Search,
  User,
  Phone,
  Calendar,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface AppointmentSheetProps {
  appointments: Appointment[];
  onViewDetails: (appointment: Appointment) => void;
  loading?: boolean;
}

type SortField = 'patient_name' | 'appointment_date' | 'appointment_time' | 'status';
type SortDirection = 'asc' | 'desc';

export const AppointmentSheet = ({
  appointments,
  onViewDetails,
  loading = false,
}: AppointmentSheetProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('appointment_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Calculate patient age from date of birth if available
  const calculateAge = (dateOfBirth?: string): number | null => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
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

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };

  // Get status badge variant
  const getStatusBadge = (status: AppointmentStatus) => {
    const variants: Record<
      AppointmentStatus,
      { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }
    > = {
      pending: { variant: 'secondary', label: 'Pending' },
      confirmed: { variant: 'default', label: 'Confirmed' },
      completed: { variant: 'outline', label: 'Completed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
    };
    return variants[status];
  };

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort appointments
  const filteredAndSortedAppointments = useMemo(() => {
    let filtered = appointments;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (apt) =>
          apt.patient_name.toLowerCase().includes(query) ||
          apt.patient_email.toLowerCase().includes(query) ||
          apt.patient_phone.toLowerCase().includes(query) ||
          apt.symptoms?.toLowerCase().includes(query) ||
          apt.reason.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'patient_name':
          aValue = a.patient_name.toLowerCase();
          bValue = b.patient_name.toLowerCase();
          break;
        case 'appointment_date':
          aValue = new Date(`${a.appointment_date}T${a.appointment_time}`);
          bValue = new Date(`${b.appointment_date}T${b.appointment_time}`);
          break;
        case 'appointment_time':
          aValue = a.appointment_time;
          bValue = b.appointment_time;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [appointments, searchQuery, sortField, sortDirection]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading appointments...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, or symptoms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredAndSortedAppointments.length} of {appointments.length} appointments
        </div>
      </div>

      {/* Appointments Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('patient_name')}
                      className="flex items-center gap-1 hover:bg-transparent"
                    >
                      Patient Name
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Symptoms</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('appointment_date')}
                      className="flex items-center gap-1 hover:bg-transparent"
                    >
                      Date & Time
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 hover:bg-transparent"
                    >
                      Status
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {searchQuery
                        ? 'No appointments match your search'
                        : 'No appointments found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedAppointments.map((appointment) => {
                    const statusBadge = getStatusBadge(appointment.status);
                    const hasDocuments =
                      appointment.documents && appointment.documents.length > 0;
                    const hasUncertainty =
                      appointment.cause_identified === false && appointment.uncertainty_note;

                    return (
                      <TableRow
                        key={appointment.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => onViewDetails(appointment)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div>
                              <div className="font-medium">{appointment.patient_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {appointment.patient_email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {appointment.patient_phone || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {/* Age calculation would require date_of_birth field */}
                            N/A
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {/* Gender would require gender field */}
                            N/A
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="text-sm truncate" title={appointment.symptoms || appointment.reason}>
                              {appointment.symptoms || appointment.reason}
                            </div>
                            {hasUncertainty && (
                              <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                                <AlertCircle className="h-3 w-3" />
                                <span>Uncertain cause</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {formatDate(appointment.appointment_date)}
                            <Clock className="h-3 w-3 text-muted-foreground ml-2" />
                            {formatTime(appointment.appointment_time)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {hasDocuments ? (
                            <div className="flex items-center gap-1 text-sm text-primary">
                              <FileText className="h-4 w-4" />
                              <span>{appointment.documents!.length}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewDetails(appointment);
                            }}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
