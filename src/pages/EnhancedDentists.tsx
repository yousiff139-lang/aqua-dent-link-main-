import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Calendar, Eye, User, MapPin, Phone, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { BookingModal } from "@/components/BookingModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Dentist {
  id: string;
  name: string;
  email: string;
  specialization: string;
  specialty?: string;
  image_url?: string;
  rating?: number;
  reviews?: number;
  years_of_experience?: number;
  expertise?: string[];
  bio?: string;
  address?: string;
  phone?: string;
  available_times?: any;
}

const EnhancedDentists = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedDentist, setSelectedDentist] = useState<any>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const [dentists, setDentists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDentists = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('dentists')
          .select('*')
          .eq('status', 'active');

        if (error) throw error;

        // Transform data if needed to match component expectations
        const dentistData = data || [];
        const formattedDentists = dentistData.map((d: any) => ({
          ...d,
          speciality: d.specialization || d.specialty || 'General Dentistry',
          image: d.image_url || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop',
          rating: d.rating || 5.0,
          reviews: d.reviews || 0,
          experience: d.years_of_experience ? `${d.years_of_experience} years` : 'Experienced',
          expertise: d.expertise || [d.specialization || 'General Dentistry']
        }));

        setDentists(formattedDentists);
      } catch (error) {
        console.error('Error fetching dentists:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDentists();
  }, []);

  const handleBookAppointment = (dentist: any) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to book an appointment.",
        variant: "default",
      });
      navigate('/auth');
      return;
    }
    setSelectedDentist(dentist);
    setShowBookingModal(true);
  };

  const handleBookingSuccess = (data: {
    appointmentId: string;
    date: string;
    time: string;
    paymentMethod: "stripe" | "cash";
    paymentStatus: "pending" | "paid";
  }) => {
    setShowBookingModal(false);
    setSelectedDentist(null);
    toast({
      title: "Appointment booked!",
      description: `Your appointment with ${selectedDentist?.name} has been confirmed for ${data.date} at ${data.time}.`,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Our Expert Dentists
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Meet our team of highly qualified dental professionals, each specializing in different areas of dentistry to provide comprehensive care for all your dental needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {dentists.map((dentist) => (
            <Card key={dentist.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                <img
                  src={dentist.image}
                  alt={dentist.name}
                  className="w-full h-64 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="bg-white/90 text-gray-800">
                    {dentist.speciality}
                  </Badge>
                </div>
              </div>

              <CardHeader>
                <CardTitle className="text-xl">{dentist.name}</CardTitle>
                <CardDescription className="text-lg font-medium text-blue-600">
                  {dentist.speciality}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm leading-relaxed">
                  {dentist.bio}
                </p>

                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-500 mr-1" />
                    <span className="font-medium">{dentist.rating}</span>
                    <span className="ml-1">({dentist.reviews} reviews)</span>
                  </div>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    <span>{dentist.experience}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{dentist.address}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <span>{dentist.phone}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <span>{dentist.email}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Specializations:</h4>
                  <div className="flex flex-wrap gap-1">
                    {dentist.expertise.map((skill, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleBookAppointment(dentist)}
                      className="flex-1"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Book Appointment
                    </Button>
                    <Button
                      variant="outline"
                      asChild
                      className="flex-1"
                    >
                      <Link to={`/dentist/${dentist.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Profile
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Can't Find the Right Specialist?
              </h2>
              <p className="text-gray-600 mb-6">
                Our AI assistant can help you find the perfect dentist for your specific needs.
                Just describe your symptoms or concerns, and we'll recommend the best specialist for you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={() => navigate('/contact')}>
                  Contact Us
                </Button>
                <Button variant="outline" size="lg">
                  Chat with AI Assistant
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />

      {/* Booking Modal */}
      {selectedDentist && (
        <BookingModal
          open={showBookingModal}
          onOpenChange={setShowBookingModal}
          dentistId={selectedDentist.id}
          dentistName={selectedDentist.name}
          dentistEmail={selectedDentist.email}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
};

export default EnhancedDentists;
