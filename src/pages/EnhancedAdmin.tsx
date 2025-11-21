import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Calendar,
  TrendingUp,
  DollarSign,
  FileText,
  Download,
  Eye,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Phone,
  Mail,
  User
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Appointment {
  id: string;
  dentist_id?: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  dentist_name: string;
  dentist_email: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  payment_status: string;
  payment_method: string;
  chief_complaint: string;
  symptoms: string;
  smoking: boolean;
  medications: string;
  allergies: string;
  cause_identified: boolean;
  uncertainty_note: string;
  pdf_report_url: string;
  created_at: string;
  medical_documents?: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
  }>;
}

interface Dentist {
  id: string;
  name: string;
  email: string;
  specialization: string;
  rating: number;
  appointment_count: number;
}

interface Analytics {
  totalAppointments: number;
  totalRevenue: number;
  completedAppointments: number;
  pendingAppointments: number;
  cancelledAppointments: number;
  paidAppointments: number;
  pendingPayments: number;
  totalDentists: number;
  averageRating: number;
}

const EnhancedAdmin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Check if user is admin
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const checkAdminAccess = async () => {
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .eq('role', 'admin')
        .single();

      if (!roles) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges.",
          variant: "destructive"
        });
        navigate('/dashboard');
        return;
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/dashboard');
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY;

      console.log('🔍 Admin: Loading data from backend API...');

      // Load appointments from backend
      const appointmentsResponse = await fetch(`${API_URL}/api/admin/appointments`, {
        headers: {
          'x-admin-api-key': ADMIN_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!appointmentsResponse.ok) {
        throw new Error(`Failed to load appointments: ${appointmentsResponse.statusText}`);
      }

      const appointmentsResult = await appointmentsResponse.json();
      const appts = appointmentsResult.data || [];

      console.log(`✅ Admin: Loaded ${appts.length} appointments from backend`);

      // Transform appointments data
      const transformedAppointments = appts.map((apt: any) => ({
        ...apt,
        dentist_id: apt.dentist_id,
        dentist_name: apt.dentist_name || 'Unknown',
        dentist_email: apt.dentist_email || 'Unknown',
        chief_complaint: apt.chief_complaint || apt.symptoms || apt.appointment_reason || 'Not specified',
        symptoms: apt.symptoms || apt.chief_complaint || 'Not specified'
      })) as Appointment[];

      setAppointments(transformedAppointments);

      // Load dentists from backend
      const dentistsResponse = await fetch(`${API_URL}/api/admin/dentists`, {
        headers: {
          'x-admin-api-key': ADMIN_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!dentistsResponse.ok) {
        throw new Error(`Failed to load dentists: ${dentistsResponse.statusText}`);
      }

      const dentistsResult = await dentistsResponse.json();
      const dentistsData = dentistsResult.data || [];

      console.log(`✅ Admin: Loaded ${dentistsData.length} dentists from backend`);

      // Dentists already have appointment counts from backend
      setDentists(dentistsData.map((d: any) => ({
        id: d.id,
        name: d.name,
        email: d.email,
        specialization: d.specialization,
        rating: d.rating || 4.5,
        appointment_count: d.totalAppointments || 0
      })));

      // Calculate analytics
      calculateAnalytics(transformedAppointments, dentistsData);

    } catch (error: any) {
      console.error('❌ Admin: Error loading data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (appts: Appointment[], dentists: any[]) => {
    const totalAppointments = appts.length;
    const completedAppointments = appts.filter(apt => apt.status === 'completed').length;
    const pendingAppointments = appts.filter(apt => apt.status === 'pending').length;
    const cancelledAppointments = appts.filter(apt => apt.status === 'cancelled').length;
    const paidAppointments = appts.filter(apt => apt.payment_status === 'paid').length;
    const pendingPayments = appts.filter(apt => apt.payment_status === 'pending').length;
    
    // Calculate revenue (assuming $50 per appointment)
    const totalRevenue = paidAppointments * 50;
    
    const totalDentists = dentists.length;
    const averageRating = dentists.reduce((sum, d) => sum + (d.rating || 0), 0) / totalDentists;

    setAnalytics({
      totalAppointments,
      totalRevenue,
      completedAppointments,
      pendingAppointments,
      cancelledAppointments,
      paidAppointments,
      pendingPayments,
      totalDentists,
      averageRating: Math.round(averageRating * 10) / 10
    });
  };

  const filterAppointments = () => {
    let filtered = appointments;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(apt =>
        apt.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.dentist_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.chief_complaint.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    // Filter by payment status
    if (paymentFilter !== "all") {
      filtered = filtered.filter(apt => apt.payment_status === paymentFilter);
    }

    // Filter by date
    if (dateFilter !== "all") {
      const today = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case "today":
          filtered = filtered.filter(apt => 
            new Date(apt.appointment_date).toDateString() === today.toDateString()
          );
          break;
        case "week":
          filterDate.setDate(today.getDate() - 7);
          filtered = filtered.filter(apt => 
            new Date(apt.appointment_date) >= filterDate
          );
          break;
        case "month":
          filterDate.setMonth(today.getMonth() - 1);
          filtered = filtered.filter(apt => 
            new Date(apt.appointment_date) >= filterDate
          );
          break;
      }
    }

    return filtered;
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const filteredAppointments = filterAppointments();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage appointments, dentists, and system analytics</p>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                    <p className="text-2xl font-bold">{analytics.totalAppointments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold">${analytics.totalRevenue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Dentists</p>
                    <p className="text-2xl font-bold">{analytics.totalDentists}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                    <p className="text-2xl font-bold">{analytics.averageRating}★</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Status Overview */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{analytics.completedAppointments}</p>
                <p className="text-sm text-gray-600">appointments</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-yellow-600">{analytics.pendingAppointments}</p>
                <p className="text-sm text-gray-600">appointments</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
                  Paid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">{analytics.paidAppointments}</p>
                <p className="text-sm text-gray-600">payments</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search appointments..."
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
              
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Appointments Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Appointments ({filteredAppointments.length})</CardTitle>
            <CardDescription>
              Complete overview of all patient appointments across the system
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
                          <Badge variant="outline">
                            {appointment.payment_method}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            Dr. {appointment.dentist_name}
                          </div>
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
                        
                        {appointment.smoking && (
                          <Badge variant="destructive" className="mt-2">
                            Smoker
                          </Badge>
                        )}
                        
                        {!appointment.cause_identified && appointment.uncertainty_note && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-sm text-yellow-800">
                              <strong>Uncertainty Note:</strong> {appointment.uncertainty_note}
                            </p>
                          </div>
                        )}
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
                          onClick={() => setSelectedAppointment(appointment)}
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
                      <label className="text-sm font-medium text-gray-500">Dentist</label>
                      <p className="text-lg">Dr. {selectedAppointment.dentist_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Date & Time</label>
                      <p className="text-lg">
                        {new Date(selectedAppointment.appointment_date).toLocaleDateString()} at {selectedAppointment.appointment_time}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Payment</label>
                      <p className="text-lg">
                        {selectedAppointment.payment_method} - {selectedAppointment.payment_status}
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
                              <p className="text-sm text-gray-500">{doc.file_type}</p>
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

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
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

export default EnhancedAdmin;
