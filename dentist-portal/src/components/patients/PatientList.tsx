import { useState } from 'react';
import { Appointment } from '@/types';
import AppointmentCard from './AppointmentCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Users } from 'lucide-react';

interface PatientListProps {
  appointments: Appointment[];
  dentistName: string;
  onMarkCompleted: (id: string) => Promise<void>;
  onUpdateNotes: (id: string, notes: string) => Promise<void>;
}

const PatientList = ({ appointments, dentistName, onMarkCompleted, onUpdateNotes }: PatientListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

  // Filter appointments
  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch = apt.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         apt.patient_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort by date (most recent first)
  const sortedAppointments = [...filteredAppointments].sort(
    (a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
  );

  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No patient appointments yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Appointments will appear here once patients book with you
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('pending')}
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('completed')}
          >
            Completed
          </Button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {sortedAppointments.length} of {appointments.length} appointments
      </p>

      {/* Appointments Grid */}
      {sortedAppointments.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              dentistName={dentistName}
              onMarkCompleted={onMarkCompleted}
              onUpdateNotes={onUpdateNotes}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No appointments match your filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PatientList;
