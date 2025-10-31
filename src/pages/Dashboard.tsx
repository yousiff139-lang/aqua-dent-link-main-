import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MessageSquare, User, LogOut, Clock, CheckCircle2, XCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ChatbotWidget } from "@/components/ChatbotWidget";
import { AppointmentsList, Appointment } from "@/components/appointments/AppointmentsList";
import { BookingHistory, HistoricalAppointment } from "@/components/appointments/BookingHistory";
import { CancellationDialog } from "@/components/appointments/CancellationDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { bookingService } from "@/services/bookingService";
import { useRealtimeAppointments } from "@/hooks/useRealtimeSync";
import { formatAppointmentDateTime } from "@/lib/appointmentUtils";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showChat, setShowChat] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchAppointments();
    }
  }, [user]);

  // Set up real-time subscription for appointment updates using unified service
  useRealtimeAppointments(
    user?.id,
    'patient',
    {
      onCreated: (newAppointment) => {
        setAppointments((prev) => [...prev, newAppointment as Appointment]);
        toast({
          title: "New Appointment",
          description: "A new appointment has been added to your schedule.",
        });
      },
      onUpdated: (updatedAppointment) => {
        setAppointments((prev) =>
          prev.map((apt) =>
            apt.id === updatedAppointment.id ? (updatedAppointment as Appointment) : apt
          )
        );
        toast({
          title: "Appointment Updated",
          description: "An appointment has been updated.",
        });
      },
      onDeleted: (deletedId) => {
        setAppointments((prev) => prev.filter((apt) => apt.id !== deletedId));
        toast({
          title: "Appointment Removed",
          description: "An appointment has been removed from your schedule.",
        });
      },
    }
  );

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', user?.id)
        .order('appointment_date', { ascending: true });

      if (error) {
        // Only show error if it's not a "no rows" error
        if (error.code !== 'PGRST116') {
          console.error('Error fetching appointments:', error);
          toast({
            title: "Error",
            description: "Failed to load appointments. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        setAppointments((data || []) as Appointment[]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      // Only show toast for unexpected errors
      if (error instanceof Error && !error.message.includes('no rows')) {
        toast({
          title: "Error",
          description: "Failed to load appointments. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = (appointmentId: string) => {
    const appointment = appointments.find((apt) => apt.id === appointmentId);
    if (appointment) {
      setAppointmentToCancel(appointment);
      setCancelDialogOpen(true);
    }
  };

  const handleConfirmCancellation = async (reason?: string) => {
    if (!appointmentToCancel) return;

    setIsCancelling(true);
    try {
      const result = await bookingService.cancelAppointment(appointmentToCancel.id, reason);

      if (result.success) {
        toast({
          title: "Appointment Cancelled",
          description: result.message,
        });
        // Refresh appointments
        await fetchAppointments();
      } else {
        toast({
          title: "Cannot Cancel",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: "Error",
        description: "Failed to cancel appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
      setCancelDialogOpen(false);
      setAppointmentToCancel(null);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      navigate('/');
    } catch (error) {
      toast({
        title: "Error",
        description: "Error signing out",
        variant: "destructive",
      });
    }
  };

  const upcomingAppointments = appointments.filter(apt => apt.status === 'upcoming');
  const completedAppointments = appointments.filter(apt => apt.status === 'completed');
  const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled');
  const historicalAppointments = [...completedAppointments, ...cancelledAppointments] as HistoricalAppointment[];
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8 animate-slide-up">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {
              profile?.full_name || 
              user?.user_metadata?.full_name || 
              user?.user_metadata?.first_name || 
              user?.email?.split('@')[0] || 
              'User'
            }! 👋
          </h1>
          <p className="text-muted-foreground">Manage your appointments and dental health journey</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="gradient-card p-6 border-border/50 hover:shadow-aqua-md transition-smooth">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-3 rounded-2xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Appointments</p>
                <p className="text-2xl font-bold">{loading ? '...' : appointments.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="gradient-card p-6 border-border/50 hover:shadow-aqua-md transition-smooth">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-3 rounded-2xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">{loading ? '...' : upcomingAppointments.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="gradient-card p-6 border-border/50 hover:shadow-aqua-md transition-smooth">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-3 rounded-2xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{loading ? '...' : completedAppointments.length}</p>
              </div>
            </div>
          </Card>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">My Appointments</h2>
              <Button className="gradient-primary text-primary-foreground" onClick={() => navigate('/dentists')}>
                <Calendar className="w-4 h-4 mr-2" />
                Book New
              </Button>
            </div>
            
            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upcoming" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Upcoming ({upcomingAppointments.length})
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  History ({historicalAppointments.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="upcoming" className="mt-6">
                {upcomingAppointments.length > 0 ? (
                  <AppointmentsList
                    appointments={upcomingAppointments}
                    loading={loading}
                    onCancelAppointment={handleCancelAppointment}
                    showCancelButton={true}
                  />
                ) : (
                  <Card className="gradient-card p-6 border-border/50">
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-muted-foreground">No upcoming appointments.</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Book your first appointment to get started!
                      </p>
                      <Button 
                        className="gradient-primary text-primary-foreground mt-4" 
                        onClick={() => navigate('/dentists')}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Book Appointment
                      </Button>
                    </div>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="history" className="mt-6">
                <BookingHistory
                  appointments={historicalAppointments}
                  loading={loading}
                />
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="space-y-6">
            <Card className="gradient-card p-6 border-border/50">
              <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-primary/5 border-primary/20"
                  onClick={() => setShowChat(true)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat with AI Assistant
                </Button>
                <Button variant="outline" className="w-full justify-start hover:bg-primary/5 border-primary/20" onClick={() => navigate('/dentists')}>
                  <Calendar className="w-4 h-4 mr-2" />
                  View Calendar
                </Button>
                <Button variant="outline" className="w-full justify-start hover:bg-primary/5 border-primary/20" onClick={() => navigate('/profile-settings')}>
                  <User className="w-4 h-4 mr-2" />
                  Update Profile
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-destructive/10 border-destructive/20 text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </Card>
            
            <Card className="gradient-card p-6 border-border/50 bg-gradient-to-br from-primary/5 to-accent/5">
              <h3 className="font-semibold text-lg mb-2">💡 Dental Tip</h3>
              <p className="text-sm text-muted-foreground">
                Remember to brush your teeth twice daily and floss at least once a day for optimal oral health!
              </p>
            </Card>
          </div>
        </div>
      </div>
      
      <CancellationDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleConfirmCancellation}
        appointmentDetails={
          appointmentToCancel
            ? {
                dentistName: appointmentToCancel.dentist_name || 'Dentist',
                date: formatAppointmentDateTime(
                  appointmentToCancel.appointment_date,
                  appointmentToCancel.appointment_time
                ).date,
                time: formatAppointmentDateTime(
                  appointmentToCancel.appointment_date,
                  appointmentToCancel.appointment_time
                ).time,
              }
            : undefined
        }
        isLoading={isCancelling}
      />
      
      <Footer />
      <ChatbotWidget />
    </div>
  );
};

export default Dashboard;
