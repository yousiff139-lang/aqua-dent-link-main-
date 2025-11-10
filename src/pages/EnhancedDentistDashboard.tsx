import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  Download, 
  AlertCircle, 
  Phone, 
  Mail, 
  Eye,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  Search
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Appointment {
  id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  payment_status: string;
  payment_method: string;
  chief_complaint: string;
  symptoms: string;
  medical_history: string;
  smoking: boolean;
  medications: string;
  allergies: string;
  previous_dental_work: string;
  cause_identified: boolean;
  uncertainty_note: string;
  patient_notes: string;
  dentist_notes: string;
  pdf_report_url: string;
  created_at: string;
  medical_documents?: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    description: string;
  }>;
}

const EnhancedDentistDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isDentist, setIsDentist] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [dentistProfile, setDentistProfile] = useState<any>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      checkDentistRole();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    filterAppointments();
  }, [appointments, searchTerm, statusFilter]);

  const checkDentistRole = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      // Check if user has dentist role
      // @ts-ignore - dentist_id column will be added by migration
      const { data: roles, error: roleError } = await (supabase as any)
        .from('user_roles')
        .select('role, dentist_id')
        .eq('user_id', user.id)
        .eq('role', 'dentist')
        .single();

      if (roleError || !roles) {
        console.log('No dentist role found:', roleError);
        
        // Check if user is admin (admins can also access dentist dashboard)
        const { data: adminRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        if (!adminRole) {
          toast({
            title: "Access Denied",
            description: "You don't have dentist privileges. Please contact an administrator.",
            variant: "destructive"
          });
          navigate('/dashboard');
          return;
        }
      }

      setIsDentist(true);
      
      // Use dentist_id from role or find/create dentist profile
      let dentistId = roles?.dentist_id;
      
      if (!dentistId) {
        // If no dentist_id in role, try to find dentist by user email or create one
        const { data: existingDentist } = await (supabase as any)
          .from('dentists')
          .select('id')
          .eq('email', user.email)
          .single();
          
        if (existingDentist) {
          dentistId = existingDentist.id;
        } else {
          // Use one of the 6 dentists from the main website
          const availableDentists = [
            {
              id: "550e8400-e29b-41d4-a716-446655440001",
              name: "Dr. Sarah Johnson",
              email: "sarah.johnson@example.com",
              specialization: "General Dentistry",
              rating: 4.8,
              experience_years: 10,
              phone: "+1-555-0101",
              address: "123 Main St, City, State",
              bio: "Experienced general dentist with focus on preventive care and patient comfort. Specializes in routine cleanings, fillings, and oral health maintenance.",
              education: "DDS from Harvard University",
              expertise: ["Preventive Care", "Restorative Dentistry", "Oral Health"]
            },
            {
              id: "550e8400-e29b-41d4-a716-446655440002",
              name: "Dr. Michael Chen",
              email: "michael.chen@example.com",
              specialization: "Orthodontics",
              rating: 4.9,
              experience_years: 15,
              phone: "+1-555-0102",
              address: "456 Oak Ave, City, State",
              bio: "Specialist in orthodontic treatments and braces. Expert in creating beautiful, straight smiles with the latest techniques.",
              education: "DDS from Stanford University, Orthodontics Residency",
              expertise: ["Braces", "Invisalign", "Jaw Surgery"]
            },
            {
              id: "550e8400-e29b-41d4-a716-446655440003",
              name: "Dr. Emily Rodriguez",
              email: "emily.rodriguez@example.com",
              specialization: "Pediatric Dentistry",
              rating: 4.7,
              experience_years: 8,
              phone: "+1-555-0103",
              address: "789 Pine St, City, State",
              bio: "Dedicated to children's dental health and comfort. Specializes in making dental visits fun and stress-free for young patients.",
              education: "DDS from UCLA, Pediatric Dentistry Fellowship",
              expertise: ["Child Dental Care", "Sedation Dentistry", "Preventive Care"]
            },
            {
              id: "550e8400-e29b-41d4-a716-446655440004",
              name: "Dr. James Wilson",
              email: "james.wilson@example.com",
              specialization: "Oral Surgery",
              rating: 4.6,
              experience_years: 12,
              phone: "+1-555-0104",
              address: "321 Elm St, City, State",
              bio: "Expert in complex oral and maxillofacial surgeries. Specializes in wisdom teeth removal, dental implants, and reconstructive procedures.",
              education: "DDS from Columbia University, Oral Surgery Residency",
              expertise: ["Wisdom Teeth", "Implants", "Jaw Surgery"]
            },
            {
              id: "550e8400-e29b-41d4-a716-446655440005",
              name: "Dr. Lisa Thompson",
              email: "lisa.thompson@example.com",
              specialization: "Cosmetic Dentistry",
              rating: 4.9,
              experience_years: 14,
              phone: "+1-555-0105",
              address: "654 Maple Dr, City, State",
              bio: "Specialist in cosmetic and aesthetic dental treatments. Expert in smile makeovers, veneers, and teeth whitening procedures.",
              education: "DDS from NYU, Cosmetic Dentistry Fellowship",
              expertise: ["Veneers", "Teeth Whitening", "Smile Design"]
            },
            {
              id: "550e8400-e29b-41d4-a716-446655440006",
              name: "Dr. Robert Brown",
              email: "robert.brown@example.com",
              specialization: "Endodontics",
              rating: 4.8,
              experience_years: 11,
              phone: "+1-555-0106",
              address: "987 Cedar Ln, City, State",
              bio: "Root canal specialist with advanced techniques. Focuses on saving teeth and providing pain-free endodontic treatments.",
              education: "DDS from University of Michigan, Endodontics Residency",
              expertise: ["Root Canals", "Endodontic Surgery", "Pain Management"]
            }
          ];

          // Check if any of these dentists exist in the database
          const { data: existingDentist } = await (supabase as any)
            .from('dentists')
            .select('id')
            .in('id', availableDentists.map(d => d.id))
            .limit(1)
            .single();
            
          if (existingDentist) {
            dentistId = existingDentist.id;
          } else {
            // Insert all 6 dentists into the database
            const { data: insertedDentists, error: insertError } = await (supabase as any)
              .from('dentists')
              .insert(availableDentists)
              .select('id')
              .limit(1);
              
            if (insertError) {
              console.error('Error inserting dentists:', insertError);
              dentistId = availableDentists[0].id; // Use first dentist as fallback
            } else {
              dentistId = insertedDentists[0].id;
            }
          }
        }
      }
      
      await loadDentistData(dentistId);
    } catch (error) {
      console.error('Error checking role:', error);
      toast({
        title: "Error",
        description: "Failed to verify dentist access. Please try again.",
        variant: "destructive"
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadDentistData = async (dentistId: string) => {
    try {
      // Load dentist profile
      // @ts-ignore - Some columns will be added by migration
      const { data: profile, error: profileError } = await (supabase as any)
        .from('dentists')
        .select('*')
        .eq('id', dentistId)
        .single();

      if (profileError) {
        console.error('Error loading dentist profile:', profileError);
      } else {
        setDentistProfile(profile);
      }

      // Load appointments with enhanced details
      // @ts-ignore - Some columns and tables will be added by migration
      const { data: appts, error: apptsError } = await (supabase as any)
        .from('appointments')
        .select(`
          *,
          medical_documents (
            id,
            file_name,
            file_url,
            file_type,
            description
          )
        `)
        .eq('dentist_id', dentistId)
        .order('appointment_date', { ascending: true });

      if (apptsError) {
        console.error('Error loading appointments:', apptsError);
        toast({
          title: "Error",
          description: "Failed to load appointments. Please refresh the page.",
          variant: "destructive"
        });
      } else {
        setAppointments((appts || []) as Appointment[]);
      }
    } catch (error) {
      console.error('Error loading dentist data:', error);
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive"
      });
    }
  };

  const filterAppointments = () => {
    let filtered = appointments;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(appointment =>
        appointment.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.patient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.chief_complaint.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(appointment => appointment.status === statusFilter);
    }

    setFilteredAppointments(filtered);
  };

  const handleViewAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
  };

  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      // @ts-ignore - Some columns will be added by migration
      const { error } = await (supabase as any)
        .from('appointments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Appointment marked as ${newStatus}`
      });

      // Update local state
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: newStatus }
            : apt
        )
      );

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
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddDentistNotes = async (appointmentId: string, notes: string) => {
    try {
      // @ts-ignore - Some columns will be added by migration
      const { error } = await (supabase as any)
        .from('appointments')
        .update({ 
          dentist_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notes added successfully"
      });

      // Update local state
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, dentist_notes: notes }
            : apt
        )
      );

      if (selectedAppointment?.id === appointmentId) {
        setSelectedAppointment({ ...selectedAppointment, dentist_notes: notes });
      }
    } catch (error) {
      console.error('Error adding notes:', error);
      toast({
        title: "Error",
        description: "Failed to add notes",
        variant: "destructive"
      });
    }
  };

  const downloadPDF = async (pdfUrl: string, patientName: string) => {
    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appointment-report-${patientName.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "PDF Downloaded",
        description: "Appointment report downloaded successfully.",
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'refunded': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dentist dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isDentist) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Access Denied</CardTitle>
            <CardDescription>
              You don't have dentist privileges. Please contact an administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, Dr. {dentistProfile?.name || 'Dentist'}
          </h1>
          <p className="text-gray-600">Manage your appointments and patient care</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                  <p className="text-2xl font-bold">{appointments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold">
                    {appointments.filter(apt => apt.status === 'pending').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold">
                    {appointments.filter(apt => apt.status === 'completed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">With Reports</p>
                  <p className="text-2xl font-bold">
                    {appointments.filter(apt => apt.pdf_report_url).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search patients, complaints..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Appointments List */}
        <Card>
          <CardHeader>
            <CardTitle>Appointments ({filteredAppointments.length})</CardTitle>
            <CardDescription>
              Manage your patient appointments and view detailed information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No appointments found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.map((appointment) => (
                  <div key={appointment.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <h3 className="font-semibold text-lg">{appointment.patient_name}</h3>
                          <Badge className={getStatusColor(appointment.status)}>
                            {appointment.status}
                          </Badge>
                          <Badge className={getPaymentStatusColor(appointment.payment_status)}>
                            {appointment.payment_status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            {new Date(appointment.appointment_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            {appointment.appointment_time}
                          </div>
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2" />
                            {appointment.patient_phone}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-700 mt-2">
                          <strong>Chief Complaint:</strong> {appointment.chief_complaint}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {appointment.pdf_report_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadPDF(appointment.pdf_report_url, appointment.patient_name)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAppointment(appointment)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointment Detail Dialog */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>
              Complete patient information and medical history
            </DialogDescription>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-6">
              {/* Patient Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Patient Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Name</label>
                      <p className="text-lg">{selectedAppointment.patient_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-lg">{selectedAppointment.patient_email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="text-lg">{selectedAppointment.patient_phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Appointment</label>
                      <p className="text-lg">
                        {new Date(selectedAppointment.appointment_date).toLocaleDateString()} at {selectedAppointment.appointment_time}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Medical Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Medical Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Chief Complaint</label>
                    <p className="mt-1">{selectedAppointment.chief_complaint}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Symptoms</label>
                    <p className="mt-1">{selectedAppointment.symptoms}</p>
                  </div>

                  {selectedAppointment.medical_history && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Medical History</label>
                      <p className="mt-1">{selectedAppointment.medical_history}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Smoking</label>
                      <p className="mt-1">{selectedAppointment.smoking ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Cause Identified</label>
                      <p className="mt-1">{selectedAppointment.cause_identified ? 'Yes' : 'No'}</p>
                    </div>
                  </div>

                  {selectedAppointment.medications && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Current Medications</label>
                      <p className="mt-1">{selectedAppointment.medications}</p>
                    </div>
                  )}

                  {selectedAppointment.allergies && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Allergies</label>
                      <p className="mt-1">{selectedAppointment.allergies}</p>
                    </div>
                  )}

                  {selectedAppointment.previous_dental_work && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Previous Dental Work</label>
                      <p className="mt-1">{selectedAppointment.previous_dental_work}</p>
                    </div>
                  )}

                  {selectedAppointment.uncertainty_note && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Uncertainty Note</label>
                      <p className="mt-1 text-yellow-700 bg-yellow-50 p-2 rounded">
                        {selectedAppointment.uncertainty_note}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Medical Documents */}
              {selectedAppointment.medical_documents && selectedAppointment.medical_documents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Medical Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedAppointment.medical_documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="font-medium">{doc.file_name}</p>
                              <p className="text-sm text-gray-500">{doc.description}</p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(doc.file_url, '_blank')}
                          >
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Dentist Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Dentist Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Add your notes about this appointment..."
                    defaultValue={selectedAppointment.dentist_notes || ''}
                    onChange={(e) => {
                      // Handle notes update
                    }}
                    className="min-h-[100px]"
                  />
                  <Button
                    className="mt-2"
                    onClick={() => {
                      const notes = (document.querySelector('textarea') as HTMLTextAreaElement)?.value;
                      if (notes) {
                        handleAddDentistNotes(selectedAppointment.id, notes);
                      }
                    }}
                  >
                    Save Notes
                  </Button>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedAppointment.id, 'completed')}
                    disabled={isUpdating}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Completed
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedAppointment.id, 'cancelled')}
                    disabled={isUpdating}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
                
                {selectedAppointment.pdf_report_url && (
                  <Button
                    onClick={() => downloadPDF(selectedAppointment.pdf_report_url, selectedAppointment.patient_name)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default EnhancedDentistDashboard;
