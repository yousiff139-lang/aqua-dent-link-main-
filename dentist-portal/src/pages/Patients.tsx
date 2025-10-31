import { useAuth } from '@/hooks/useAuth';
import { usePatients } from '@/hooks/usePatients';
import PatientList from '@/components/patients/PatientList';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

const Patients = () => {
  const { dentist } = useAuth();
  const { appointments, isLoading, error, markAsCompleted, updateNotes } = usePatients(dentist?.email);

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Patients</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Patients</h1>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Patients</h1>
      <PatientList
        appointments={appointments}
        dentistName={dentist?.full_name || 'Doctor'}
        onMarkCompleted={markAsCompleted}
        onUpdateNotes={updateNotes}
      />
    </div>
  );
};

export default Patients;
