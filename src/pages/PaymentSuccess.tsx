import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, Download, Calendar, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AppointmentData {
  id: string;
  patient_name: string;
  dentist_name: string;
  appointment_date: string;
  appointment_time: string;
  payment_method: string;
  payment_status: string;
  pdf_report_url?: string;
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      navigate('/dashboard');
      return;
    }

    fetchAppointmentData();
  }, [sessionId]);

  const fetchAppointmentData = async () => {
    try {
      // Get appointment by session ID
      const { data: appointmentData, error } = await supabase
        .from('appointments')
        .select(`
          id,
          patient_name,
          appointment_date,
          appointment_time,
          payment_method,
          payment_status,
          pdf_report_url,
          dentists!appointments_dentist_id_fkey (
            name
          )
        `)
        .eq('stripe_session_id', sessionId)
        .single();

      if (error) {
        console.error('Error fetching appointment:', error);
        toast({
          title: "Error",
          description: "Failed to load appointment details.",
          variant: "destructive"
        });
        return;
      }

      if (appointmentData) {
        setAppointment({
          ...appointmentData,
          dentist_name: appointmentData.dentists?.name || 'Unknown Dentist'
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!appointment?.pdf_report_url) {
      toast({
        title: "PDF not available",
        description: "The appointment report PDF is not yet ready. Please try again later.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Download PDF from Supabase storage
      const response = await fetch(appointment.pdf_report_url);
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appointment-report-${appointment.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "PDF Downloaded",
        description: "Your appointment report has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the PDF. Please try again later.",
        variant: "destructive"
      });
    }
  };

  const addToCalendar = () => {
    if (!appointment) return;

    const startDate = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Dental Appointment with ${appointment.dentist_name}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=Dental appointment with ${appointment.dentist_name}&location=Dental Clinic`;

    window.open(calendarUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading appointment details...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Appointment Not Found</CardTitle>
            <CardDescription>
              We couldn't find the appointment details. Please contact support if this issue persists.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-lg text-gray-600">
            Your appointment has been confirmed and payment processed successfully.
          </p>
        </div>

        {/* Appointment Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Appointment Details</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {appointment.payment_status.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Patient Name</label>
                <p className="text-lg">{appointment.patient_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Dentist</label>
                <p className="text-lg">{appointment.dentist_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Date</label>
                <p className="text-lg">{new Date(appointment.appointment_date).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Time</label>
                <p className="text-lg">{appointment.appointment_time}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Payment Method</label>
                <p className="text-lg capitalize">{appointment.payment_method}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Appointment ID</label>
                <p className="text-lg font-mono text-sm">{appointment.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Button
            onClick={downloadPDF}
            disabled={!appointment.pdf_report_url}
            className="w-full"
            variant="outline"
          >
            <Download className="mr-2 h-4 w-4" />
            {appointment.pdf_report_url ? 'Download Report' : 'PDF Not Ready'}
          </Button>

          <Button
            onClick={addToCalendar}
            className="w-full"
            variant="outline"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Add to Calendar
          </Button>

          <Button
            onClick={() => navigate('/dashboard')}
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">1</span>
                </div>
                <div>
                  <p className="font-medium">Confirmation Email</p>
                  <p className="text-sm text-gray-600">You'll receive a confirmation email with all the details.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">2</span>
                </div>
                <div>
                  <p className="font-medium">Dentist Notification</p>
                  <p className="text-sm text-gray-600">Your dentist has been notified and will prepare for your visit.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">3</span>
                </div>
                <div>
                  <p className="font-medium">Prepare for Your Visit</p>
                  <p className="text-sm text-gray-600">Bring a valid ID and arrive 10 minutes early for your appointment.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}