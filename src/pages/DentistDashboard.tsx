import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, Clock, User, FileText, Download, AlertCircle, Phone, Mail } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { generateAppointmentPDF, pdfToBlob } from "@/services/pdfGenerator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DentistDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isDentist, setIsDentist] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [dentistProfile, setDentistProfile] = useState<any>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  useEffect(() => {
    checkDentistRole();
  }, [user]);

  const checkDentistRole = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      // Check if user has dentist role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'dentist')
        .single();

      if (!roles) {
        toast({
          title: "Access Denied",
          description: "You don't have dentist privileges.",
          variant: "destructive"
        });
        navigate('/dashboard');
        return;
      }

      setIsDentist(true);
      await loadDentistData();
    } catch (error) {
      console.error('Error checking role:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadDentistData = async () => {
    if (!user) return;

    try {
      // Load dentist profile
      const { data: profile } = await supabase
        .from('dentists')
        .select(`
          *,
          profiles!inner(full_name, email)
        `)
        .eq('id', user.id)
        .single();

      setDentistProfile(profile);

      // Load appointments with patient details and medical information
      const { data: appts } = await supabase
        .from('appointments')
        .select(`
          *,
          symptoms,
          chronic_diseases,
          gender,
          is_pregnant,
          medications,
          allergies,
          previous_dental_work,
          smoking,
          chief_complaint,
          medical_history,
          documents,
          patient:profiles!appointments_patient_id_fkey(full_name, email, phone)
        `)
        .eq('dentist_id', user.id)
        .order('appointment_date', { ascending: true });

      setAppointments(appts || []);

      // Load availability
      const { data: avail } = await supabase
        .from('dentist_availability')
        .select('*')
        .eq('dentist_id', user.id)
        .order('day_of_week');

      setAvailability(avail || []);
    } catch (error) {
      console.error('Error loading dentist data:', error);
      toast({
        title: "Error",
        description: "Failed to load data.",
        variant: "destructive"
      });
    }
  };

  const handleViewAppointment = (appointment: any) => {
    setSelectedAppointment(appointment);
  };

  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Appointment marked as ${newStatus}`
      });

      loadDentistData();
      if (selectedAppointment?.id === appointmentId) {
        setSelectedAppointment({ ...selectedAppointment, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive"
      });
    }
  };


  const handleDownloadPDF = async (appointment: any) => {
    try {
      // Fetch medical information from dedicated table
      const { data: medicalInfo, error: medicalError } = await supabase
        .from('appointment_medical_info')
        .select('*')
        .eq('appointment_id', appointment.id)
        .single();

      if (medicalError) {
        console.error('Error fetching medical info:', medicalError);
      }

      // Use medical info from dedicated table if available, fallback to appointment data
      const documents = medicalInfo?.documents || appointment.documents || [];
      console.log('Raw documents from DB:', documents);
      console.log('Medical info:', medicalInfo);

      const documentUrls = Array.isArray(documents)
        ? documents.map((doc: any) => doc.url || doc)
        : [];

      console.log('Extracted document URLs:', documentUrls);

      const gender = medicalInfo?.gender || appointment.gender;
      const isFemale = gender?.toLowerCase() === 'female';

      const pdfData = {
        patientName: appointment.patient?.full_name || 'Unknown',
        dentistName: dentistProfile?.profiles?.full_name || 'Unknown',
        symptoms: medicalInfo?.symptoms || appointment.symptoms || appointment.reason || 'Not specified',
        appointmentTime: appointment.appointment_time || '',
        appointmentDate: appointment.appointment_date || '',
        paymentMethod: (appointment.payment_method || 'cash') as 'cash' | 'card',
        bookingReference: appointment.booking_reference || appointment.id,
        gender: gender,
        // Only include pregnancy status if patient is female
        isPregnant: isFemale ? (medicalInfo?.is_pregnant || appointment.is_pregnant) : undefined,
        chronicDiseases: medicalInfo?.chronic_diseases || appointment.chronic_diseases,
        medicalHistory: medicalInfo?.medical_history || appointment.medical_history,
        medications: medicalInfo?.medications || appointment.medications,
        allergies: medicalInfo?.allergies || appointment.allergies,
        previousDentalWork: medicalInfo?.previous_dental_work || appointment.previous_dental_work,
        smoking: medicalInfo?.smoking ?? appointment.smoking,
        documentUrls: documentUrls,
      };

      console.log('PDF Data being passed:', pdfData);

      const pdfBytes = generateAppointmentPDF(pdfData);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `appointment-${appointment.booking_reference || appointment.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "PDF downloaded successfully"
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive"
      });
    }
  };


  const handleAddAvailability = async () => {
    const dayOfWeek = 1; // Monday as default
    const startTime = "09:00";
    const endTime = "17:00";

    try {
      const { error } = await supabase
        .from('dentist_availability')
        .insert({
          dentist_id: user!.id,
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          is_available: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Availability added successfully"
      });

      loadDentistData();
    } catch (error) {
      console.error('Error adding availability:', error);
      toast({
        title: "Error",
        description: "Failed to add availability",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    try {
      const { error } = await supabase
        .from('dentist_availability')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Availability deleted successfully"
      });

      loadDentistData();
    } catch (error) {
      console.error('Error deleting availability:', error);
      toast({
        title: "Error",
        description: "Failed to delete availability",
        variant: "destructive"
      });
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const upcomingAppointments = appointments.filter(a => a.status === 'upcoming');
  const todayAppointments = appointments.filter(a => {
    const appointmentDate = new Date(a.appointment_date);
    const today = new Date();
    return appointmentDate.toDateString() === today.toDateString() && a.status === 'upcoming';
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isDentist) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Dentist Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome, Dr. {dentistProfile?.profiles?.full_name}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{appointments.length}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayAppointments.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Scheduled for today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingAppointments.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Pending appointments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Slots</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{availability.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Weekly schedule</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Patient Appointments</CardTitle>
                <CardDescription>View and manage your patient appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">No appointments yet</p>
                  ) : (
                    appointments.map((appointment) => (
                      <div key={appointment.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{appointment.patient?.full_name}</h3>
                              <Badge variant={
                                appointment.status === 'upcoming' ? 'default' :
                                  appointment.status === 'completed' ? 'secondary' :
                                    'outline'
                              }>
                                {appointment.status}
                              </Badge>
                              {appointment.recommended_by_ai && (
                                <Badge variant="outline" className="bg-primary/10">
                                  ✨ AI Recommended
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {appointment.patient?.email}
                              </div>
                              {appointment.patient?.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {appointment.patient.phone}
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewAppointment(appointment)}
                          >
                            View Details
                          </Button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="font-medium">Date & Time:</span>
                            <p className="text-muted-foreground">
                              {new Date(appointment.appointment_date).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Type:</span>
                            <p className="text-muted-foreground">{appointment.appointment_type}</p>
                          </div>
                        </div>

                        {appointment.symptoms && (
                          <div className="mt-3 p-3 bg-muted rounded-md">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 mt-0.5 text-orange-500" />
                              <div>
                                <span className="font-medium text-sm">Symptoms:</span>
                                <p className="text-sm text-muted-foreground">{appointment.symptoms}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="availability">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Availability Schedule</CardTitle>
                    <CardDescription>Manage your clinic hours</CardDescription>
                  </div>
                  <Button onClick={handleAddAvailability} size="sm">
                    Add Slot
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {availability.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">No availability set</p>
                  ) : (
                    availability.map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between border rounded-lg p-4">
                        <div>
                          <p className="font-medium">{dayNames[slot.day_of_week]}</p>
                          <p className="text-sm text-muted-foreground">
                            {slot.start_time} - {slot.end_time}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAvailability(slot.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Appointment Details Dialog */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>
              Complete patient information and appointment details
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-6">
              {/* Patient Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Patient Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Name</p>
                      <p className="text-sm text-muted-foreground">{selectedAppointment.patient?.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{selectedAppointment.patient?.email}</p>
                    </div>
                    {selectedAppointment.patient?.phone && (
                      <div>
                        <p className="text-sm font-medium">Phone</p>
                        <p className="text-sm text-muted-foreground">{selectedAppointment.patient.phone}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Appointment Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Appointment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Date & Time</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedAppointment.appointment_date).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Type</p>
                      <p className="text-sm text-muted-foreground">{selectedAppointment.appointment_type}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <Badge variant={
                        selectedAppointment.status === 'upcoming' ? 'default' :
                          selectedAppointment.status === 'completed' ? 'secondary' :
                            'outline'
                      }>
                        {selectedAppointment.status}
                      </Badge>
                    </div>
                    {selectedAppointment.recommended_by_ai && (
                      <div>
                        <p className="text-sm font-medium">Booking Method</p>
                        <Badge variant="outline" className="bg-primary/10">
                          ✨ AI Recommended
                        </Badge>
                      </div>
                    )}
                  </div>

                  {selectedAppointment.symptoms && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Symptoms / Chief Complaint</p>
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">{selectedAppointment.symptoms}</p>
                      </div>
                    </div>
                  )}

                  {selectedAppointment.patient_notes && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Patient Notes</p>
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">{selectedAppointment.patient_notes}</p>
                      </div>
                    </div>
                  )}

                  {selectedAppointment.medical_history && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Medical History</p>
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">{selectedAppointment.medical_history}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Medical Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Medical Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedAppointment.gender && (
                      <div>
                        <p className="text-sm font-medium">Gender</p>
                        <p className="text-sm text-muted-foreground capitalize">{selectedAppointment.gender}</p>
                      </div>
                    )}
                    {selectedAppointment.is_pregnant !== undefined && selectedAppointment.is_pregnant !== null && (
                      <div>
                        <p className="text-sm font-medium">Pregnant</p>
                        <p className="text-sm text-muted-foreground">{selectedAppointment.is_pregnant ? 'Yes' : 'No'}</p>
                      </div>
                    )}
                  </div>

                  {selectedAppointment.chronic_diseases && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Chronic Diseases</p>
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">{selectedAppointment.chronic_diseases}</p>
                      </div>
                    </div>
                  )}

                  {selectedAppointment.medications && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Current Medications</p>
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">{selectedAppointment.medications}</p>
                      </div>
                    </div>
                  )}

                  {selectedAppointment.allergies && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Allergies</p>
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">{selectedAppointment.allergies}</p>
                      </div>
                    </div>
                  )}

                  {selectedAppointment.previous_dental_work && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Previous Dental Work</p>
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">{selectedAppointment.previous_dental_work}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Uploaded Documents */}
              {selectedAppointment.documents && Array.isArray(selectedAppointment.documents) && selectedAppointment.documents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Uploaded Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedAppointment.documents.map((doc: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md border">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <span className="text-sm truncate" title={doc.name}>{doc.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(doc.url, '_blank')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Notes */}
              {selectedAppointment.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Additional Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm text-muted-foreground">{selectedAppointment.notes}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {selectedAppointment.status === 'upcoming' && (
                  <Button
                    onClick={() => handleUpdateStatus(selectedAppointment.id, 'completed')}
                    className="flex-1"
                  >
                    Mark as Completed
                  </Button>
                )}
                {selectedAppointment.status === 'upcoming' && (
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedAppointment.id, 'cancelled')}
                    className="flex-1"
                  >
                    Cancel Appointment
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setSelectedAppointment(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default DentistDashboard;
