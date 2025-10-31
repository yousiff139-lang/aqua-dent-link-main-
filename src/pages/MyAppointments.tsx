import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Clock, User, CreditCard, Banknote, Filter } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorDisplay } from "@/components/ui/error-display";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/AuthContext";
import { appointmentService, Appointment, AppointmentStatus } from "@/services/appointmentService";
import { useNavigate } from "react-router-dom";
import { useRealtimeAppointments } from '@/hooks/useRealtimeSync';

const MyAppointments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "all">("all");

  // Fetch appointments using React Query
  const {
    data: appointmentsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["patient-appointments", user?.email],
    queryFn: async () => {
      if (!user?.email) {
        throw new Error("User email not found");
      }
      return appointmentService.getPatientAppointments(user.email);
    },
    enabled: !!user?.email,
  });

  // Set up real-time subscription for instant updates
  useRealtimeAppointments(
    user?.id,
    'patient',
    {
      onCreated: (newAppointment) => {
        refetch();
        console.log('🆕 New appointment received in real-time');
      },
      onUpdated: (updatedAppointment) => {
        refetch();
        console.log('🔄 Appointment updated in real-time');
      },
      onDeleted: (deletedId) => {
        refetch();
        console.log('🗑️ Appointment deleted in real-time');
      },
    }
  );

  // Filter and sort appointments
  const filteredAppointments = appointmentsData?.data
    ? appointmentsData.data
        .filter((appointment) => {
          if (statusFilter === "all") return true;
          return appointment.status === statusFilter;
        })
        .sort((a, b) => {
          // Sort by date (upcoming first)
          const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
          const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
          return dateA.getTime() - dateB.getTime();
        })
    : [];

  // Get status badge variant
  const getStatusBadgeVariant = (status: AppointmentStatus) => {
    switch (status) {
      case "completed":
        return "default";
      case "confirmed":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Get payment status badge
  const getPaymentStatusBadge = (paymentStatus: string, paymentMethod: string) => {
    if (paymentStatus === "paid") {
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          Paid
        </Badge>
      );
    } else if (paymentStatus === "failed") {
      return (
        <Badge variant="destructive">
          Failed
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          {paymentMethod === "cash" ? "Pay at Appointment" : "Pending"}
        </Badge>
      );
    }
  };

  // Format date for display
  const formatAppointmentDate = (date: string) => {
    try {
      return format(new Date(date), "EEEE, MMMM d, yyyy");
    } catch {
      return date;
    }
  };

  // Format time for display
  const formatAppointmentTime = (time: string) => {
    try {
      return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return time;
    }
  };

  // Redirect to auth if not logged in
  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <section className="pt-28 pb-12 container mx-auto px-4 flex-1">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">My Appointments</h1>
            <p className="text-muted-foreground">
              View and manage your dental appointments
            </p>
          </div>

          {/* Filter */}
          <div className="mb-6 flex items-center gap-3">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as AppointmentStatus | "all")}
            >
              <SelectTrigger className="w-[200px]">
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

          {/* Loading State */}
          {isLoading && (
            <LoadingSpinner size="lg" text="Loading appointments..." className="py-12" />
          )}

          {/* Error State */}
          {error && (
            <ErrorDisplay
              title="Failed to Load Appointments"
              message={error instanceof Error ? error.message : "Failed to load appointments. Please try again."}
              onRetry={() => refetch()}
            />
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredAppointments.length === 0 && (
            <EmptyState
              icon={Calendar}
              title="No appointments found"
              description={
                statusFilter === "all"
                  ? "You haven't booked any appointments yet. Browse our dentists to schedule your first appointment."
                  : `You don't have any ${statusFilter} appointments.`
              }
              actionLabel={statusFilter === "all" ? "Browse Dentists" : undefined}
              onAction={statusFilter === "all" ? () => navigate("/dentists") : undefined}
            />
          )}

          {/* Appointments List */}
          {!isLoading && !error && filteredAppointments.length > 0 && (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-1">
                          {appointment.dentist_email.split("@")[0].replace(/\./g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </CardTitle>
                        <CardDescription>{appointment.reason}</CardDescription>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <Badge variant={getStatusBadgeVariant(appointment.status)}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </Badge>
                        {getPaymentStatusBadge(appointment.payment_status, appointment.payment_method)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Date */}
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Date</p>
                          <p className="text-sm text-muted-foreground">
                            {formatAppointmentDate(appointment.appointment_date)}
                          </p>
                        </div>
                      </div>

                      {/* Time */}
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Time</p>
                          <p className="text-sm text-muted-foreground">
                            {formatAppointmentTime(appointment.appointment_time)}
                          </p>
                        </div>
                      </div>

                      {/* Dentist Email */}
                      <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Dentist</p>
                          <p className="text-sm text-muted-foreground">
                            {appointment.dentist_email}
                          </p>
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div className="flex items-start gap-3">
                        {appointment.payment_method === "stripe" ? (
                          <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                        ) : (
                          <Banknote className="h-5 w-5 text-muted-foreground mt-0.5" />
                        )}
                        <div>
                          <p className="text-sm font-medium">Payment Method</p>
                          <p className="text-sm text-muted-foreground">
                            {appointment.payment_method === "stripe"
                              ? "Credit/Debit Card"
                              : "Cash Payment"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {appointment.notes && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-1">Notes</p>
                        <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default MyAppointments;
