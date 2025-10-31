import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  LogOut,
  Phone,
  Mail,
  FileText,
  DollarSign,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { dentistService } from "@/services/dentistService";
import type { Booking, DentistStats, BookingFilter } from "@/types/dentist";

const DentistPortal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<DentistStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BookingFilter>('all');
  const [dentistName, setDentistName] = useState('');

  useEffect(() => {
    checkDentistAccess();
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    filterBookings();
  }, [bookings, filter]);

  const checkDentistAccess = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const isDentist = await dentistService.isDentist(user.id);
    if (!isDentist) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the dentist portal",
        variant: "destructive",
      });
      navigate('/');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch dentist profile
      const profile = await dentistService.getDentistProfile(user!.id);
      if (profile) {
        setDentistName(profile.full_name);
      }

      // Fetch bookings and stats
      const [bookingsData, statsData] = await Promise.all([
        dentistService.getBookings(user!.id),
        dentistService.getStats(user!.id),
      ]);

      setBookings(bookingsData);
      setStats(statsData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    if (filter === 'all') {
      setFilteredBookings(bookings);
    } else {
      setFilteredBookings(bookings.filter(b => b.status === filter));
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      upcoming: 'bg-blue-100 text-blue-700 border-blue-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200',
    };
    
    const icons = {
      upcoming: <Clock className="w-3 h-3" />,
      completed: <CheckCircle2 className="w-3 h-3" />,
      cancelled: <XCircle className="w-3 h-3" />,
    };

    return (
      <Badge className={`${variants[status as keyof typeof variants]} flex items-center gap-1`}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <p className="text-center text-muted-foreground">Loading portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              Welcome, Dr. {dentistName || user?.email?.split('@')[0]}! 👨‍⚕️
            </h1>
            <p className="text-muted-foreground">Manage your appointments and patients</p>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="border-border/50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="gradient-card p-6 border-border/50 hover:shadow-aqua-md transition-smooth">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-3 rounded-2xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{stats?.totalBookings || 0}</p>
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
                <p className="text-2xl font-bold">{stats?.upcomingBookings || 0}</p>
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
                <p className="text-2xl font-bold">{stats?.completedBookings || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="gradient-card p-6 border-border/50 hover:shadow-aqua-md transition-smooth">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-2xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">${stats?.totalRevenue?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'gradient-primary text-white' : ''}
          >
            All ({bookings.length})
          </Button>
          <Button
            variant={filter === 'upcoming' ? 'default' : 'outline'}
            onClick={() => setFilter('upcoming')}
            className={filter === 'upcoming' ? 'gradient-primary text-white' : ''}
          >
            Upcoming ({stats?.upcomingBookings || 0})
          </Button>
          <Button
            variant={filter === 'completed' ? 'default' : 'outline'}
            onClick={() => setFilter('completed')}
            className={filter === 'completed' ? 'gradient-primary text-white' : ''}
          >
            Completed ({stats?.completedBookings || 0})
          </Button>
          <Button
            variant={filter === 'cancelled' ? 'default' : 'outline'}
            onClick={() => setFilter('cancelled')}
            className={filter === 'cancelled' ? 'gradient-primary text-white' : ''}
          >
            Cancelled ({stats?.cancelledBookings || 0})
          </Button>
        </div>

        {/* Bookings Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBookings.length > 0 ? (
            filteredBookings.map((booking) => (
              <Card
                key={booking.id}
                className="gradient-card p-6 border-border/50 hover:shadow-aqua-md transition-smooth cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src="" alt={booking.patient_name} />
                      <AvatarFallback className="bg-gradient-primary text-white">
                        {getInitials(booking.patient_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{booking.patient_name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {booking.booking_reference}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {new Date(booking.appointment_date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {booking.appointment_time}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    {booking.patient_phone || 'N/A'}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    {booking.symptoms.substring(0, 50)}...
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border/50 flex gap-2">
                  {booking.status === 'upcoming' && (
                    <Button
                      size="sm"
                      className="flex-1 gradient-primary text-white"
                    >
                      Mark Completed
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    View Details
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="gradient-card p-12 border-border/50 col-span-full">
              <p className="text-center text-muted-foreground">
                No {filter !== 'all' ? filter : ''} bookings found
              </p>
            </Card>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default DentistPortal;
