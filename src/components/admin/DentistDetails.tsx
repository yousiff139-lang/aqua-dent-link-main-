import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dentist, DentistStats } from "@/types/admin";
import { 
  User, 
  Mail, 
  Briefcase, 
  Star, 
  Calendar, 
  CheckCircle, 
  Clock,
  AlertCircle 
} from "lucide-react";
import { fetchDentistAppointments } from "@/lib/admin-queries";
import { AvailabilityManager } from "./AvailabilityManager";
import { PatientList } from "./PatientList";

interface DentistDetailsProps {
  dentist: Dentist;
  onUpdate?: () => void;
}

export const DentistDetails = ({ dentist, onUpdate }: DentistDetailsProps) => {
  const [stats, setStats] = useState<DentistStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, [dentist.id]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch appointments to calculate stats
      const appointments = await fetchDentistAppointments(dentist.id);
      
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      const totalAppointments = appointments.length;
      const upcomingAppointments = appointments.filter(apt => {
        const aptDate = apt.appointment_date;
        return aptDate >= today && apt.status !== 'cancelled' && apt.status !== 'completed';
      }).length;
      
      const completedAppointments = appointments.filter(
        apt => apt.status === 'completed'
      ).length;
      
      // Get unique patient count
      const uniquePatients = new Set(appointments.map(apt => apt.patient_id));
      const totalPatients = uniquePatients.size;

      setStats({
        total_appointments: totalAppointments,
        upcoming_appointments: upcomingAppointments,
        completed_appointments: completedAppointments,
        total_patients: totalPatients,
        average_rating: dentist.rating,
      });
    } catch (err: any) {
      console.error('Error loading dentist stats:', err);
      const errorMessage = err.message || 'Failed to load dentist statistics';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <DentistDetailsSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={loadStats} />;
  }

  return (
    <div className="space-y-6">
      {/* Profile Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Dentist Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-4 rounded-full">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{dentist.full_name}</h2>
              <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{dentist.email}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Specialization</p>
              <Badge variant="secondary" className="text-sm">
                {dentist.specialization}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Experience</p>
              <div className="flex items-center gap-1">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">
                  {dentist.years_of_experience || 0} years
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Rating</p>
              <div className="flex items-center gap-1 text-yellow-600">
                <Star className="w-4 h-4 fill-current" />
                <span className="font-medium">{dentist.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {dentist.bio && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Bio</p>
              <p className="text-sm">{dentist.bio}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Card */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={<Calendar className="w-5 h-5" />}
                label="Total Appointments"
                value={stats.total_appointments}
                variant="default"
              />
              <StatCard
                icon={<Clock className="w-5 h-5" />}
                label="Upcoming"
                value={stats.upcoming_appointments}
                variant="info"
              />
              <StatCard
                icon={<CheckCircle className="w-5 h-5" />}
                label="Completed"
                value={stats.completed_appointments}
                variant="success"
              />
              <StatCard
                icon={<User className="w-5 h-5" />}
                label="Total Patients"
                value={stats.total_patients}
                variant="default"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabbed Interface for Availability and Patients */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="availability" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="availability">Availability</TabsTrigger>
              <TabsTrigger value="patients">Patients</TabsTrigger>
            </TabsList>
            <TabsContent value="availability" className="mt-4">
              <AvailabilityManager dentistId={dentist.id} onUpdate={onUpdate} />
            </TabsContent>
            <TabsContent value="patients" className="mt-4">
              <PatientList dentistId={dentist.id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  variant: "default" | "info" | "success";
}

const StatCard = ({ icon, label, value, variant }: StatCardProps) => {
  const variantStyles = {
    default: "bg-gray-100 text-gray-700",
    info: "bg-blue-100 text-blue-700",
    success: "bg-green-100 text-green-700",
  };

  return (
    <div className={`p-4 rounded-lg ${variantStyles[variant]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium uppercase">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};



// Loading skeleton
const DentistDetailsSkeleton = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  );
};

// Error state component
interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

const ErrorState = ({ error, onRetry }: ErrorStateProps) => {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-16 h-16 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Details</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </CardContent>
    </Card>
  );
};
