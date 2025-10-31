import { useAuth } from '@/hooks/useAuth';
import { useAvailability } from '@/hooks/useAvailability';
import WeeklyAvailabilityForm from '@/components/availability/WeeklyAvailabilityForm';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Calendar } from 'lucide-react';

const AvailableTimes = () => {
  const { dentist } = useAuth();
  const { availability, isLoading, error, saveAvailability } = useAvailability(dentist?.id);

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Availability Management</h1>
          <p className="text-muted-foreground">
            Set your weekly schedule to allow patients to book appointments
          </p>
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Availability Management</h1>
          <p className="text-muted-foreground">
            Set your weekly schedule to allow patients to book appointments
          </p>
        </div>
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

  if (!dentist?.id) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Availability Management</h1>
          <p className="text-muted-foreground">
            Set your weekly schedule to allow patients to book appointments
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Calendar className="h-5 w-5" />
              <p>Please log in to manage your availability</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Availability Management</h1>
        <p className="text-muted-foreground">
          Set your weekly schedule to allow patients to book appointments
        </p>
      </div>

      <WeeklyAvailabilityForm
        dentistId={dentist.id}
        onSave={saveAvailability}
        initialData={availability}
      />
    </div>
  );
};

export default AvailableTimes;
