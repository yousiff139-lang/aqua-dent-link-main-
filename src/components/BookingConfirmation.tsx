import { CheckCircle2, Calendar, Clock, CreditCard, Banknote, Home, FileText, CalendarPlus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BookingConfirmationProps {
  appointmentId: string;
  dentistName: string;
  date: string; // YYYY-MM-DD format
  time: string; // HH:mm format
  paymentMethod: "stripe" | "cash";
  paymentStatus: "pending" | "paid";
}

interface AppointmentDetails {
  booking_reference?: string | null;
  dentist_name?: string;
  appointment_date?: string;
  appointment_time?: string;
  payment_method?: string;
  payment_status?: string;
}

export function BookingConfirmation({
  appointmentId,
  dentistName,
  date,
  time,
  paymentMethod,
  paymentStatus,
}: BookingConfirmationProps) {
  const navigate = useNavigate();
  const [appointmentDetails, setAppointmentDetails] = useState<AppointmentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch full appointment details including booking_reference
  useEffect(() => {
    const fetchAppointmentDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', appointmentId)
          .single();

        if (error) {
          console.error('Error fetching appointment details:', error);
        } else if (data) {
          // Extract only the fields we need (using type assertion for fields not in generated types)
          const appointmentData = data as any;
          setAppointmentDetails({
            booking_reference: appointmentData.booking_reference,
            appointment_date: appointmentData.appointment_date,
            appointment_time: appointmentData.appointment_time,
            payment_method: appointmentData.payment_method,
            payment_status: appointmentData.payment_status,
          });
        }
      } catch (err) {
        console.error('Failed to fetch appointment details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointmentDetails();
  }, [appointmentId]);

  // Use fetched details if available, otherwise use props
  const displayDate = appointmentDetails?.appointment_date || date;
  const displayTime = appointmentDetails?.appointment_time || time;
  const displayPaymentMethod = (appointmentDetails?.payment_method || paymentMethod) as "stripe" | "cash";
  const displayPaymentStatus = (appointmentDetails?.payment_status || paymentStatus) as "pending" | "paid";
  const bookingReference = appointmentDetails?.booking_reference || appointmentId;

  // Format the date for display
  const formattedDate = format(new Date(displayDate), "EEEE, MMMM d, yyyy");
  
  // Format the time for display
  const formattedTime = new Date(`2000-01-01T${displayTime}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const handleViewDashboard = () => {
    // Navigate to patient dashboard
    navigate("/dashboard");
  };

  const handleBookAnother = () => {
    // Navigate to dentists list to book another appointment
    navigate("/dentists");
  };

  const handleReturnHome = () => {
    navigate("/");
  };

  // Show loading state while fetching details
  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading appointment details...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Appointment Confirmed!</CardTitle>
          <CardDescription>
            Your appointment has been successfully booked
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Appointment Details */}
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="font-semibold text-lg mb-3">Appointment Details</h3>
              
              {/* Booking Reference */}
              <div className="flex items-start gap-3 mb-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Booking Reference</p>
                  <p className="text-sm text-muted-foreground font-mono">{bookingReference}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Please save this reference number for your records
                  </p>
                </div>
              </div>

              {/* Dentist */}
              <div className="flex items-start gap-3 mb-3">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-primary">Dr</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Dentist</p>
                  <p className="text-sm text-muted-foreground">{dentistName}</p>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-start gap-3 mb-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Date</p>
                  <p className="text-sm text-muted-foreground">{formattedDate}</p>
                </div>
              </div>

              {/* Time */}
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Time</p>
                  <p className="text-sm text-muted-foreground">{formattedTime}</p>
                </div>
              </div>
            </div>

            {/* Payment Status */}
            <div className="border-b pb-4">
              <h3 className="font-semibold text-lg mb-3">Payment Information</h3>
              
              <div className="flex items-start gap-3">
                {displayPaymentMethod === "stripe" ? (
                  <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                ) : (
                  <Banknote className="h-5 w-5 text-muted-foreground mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">Payment Method</p>
                  <p className="text-sm text-muted-foreground">
                    {displayPaymentMethod === "stripe" ? "Credit/Debit Card" : "Cash Payment"}
                  </p>
                  <div className="mt-2">
                    {displayPaymentStatus === "paid" ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                        Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                        Payment Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cash Payment Reminder */}
          {displayPaymentMethod === "cash" && displayPaymentStatus === "pending" && (
            <Alert>
              <Banknote className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Please remember to bring payment to your appointment. 
                Cash or card payment will be accepted at the dental office.
              </AlertDescription>
            </Alert>
          )}

          {/* Stripe Payment Confirmation */}
          {displayPaymentMethod === "stripe" && displayPaymentStatus === "paid" && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Your payment has been successfully processed. A confirmation email has been sent to your email address.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleViewDashboard}
                className="flex-1"
                variant="default"
              >
                <FileText className="mr-2 h-4 w-4" />
                View in Dashboard
              </Button>
              <Button
                onClick={handleBookAnother}
                className="flex-1"
                variant="outline"
              >
                <CalendarPlus className="mr-2 h-4 w-4" />
                Book Another Appointment
              </Button>
            </div>
            <Button
              onClick={handleReturnHome}
              className="w-full"
              variant="ghost"
            >
              <Home className="mr-2 h-4 w-4" />
              Return to Home
            </Button>
          </div>

          {/* Additional Information */}
          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            <p>
              If you need to reschedule or have any questions, please contact the dental office directly.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
