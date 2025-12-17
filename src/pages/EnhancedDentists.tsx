import { useState, memo } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useDentists, usePrefetchDentist, usePrefetchAllDentists } from "@/hooks/useDentist";
import { CardGridSkeleton } from "@/components/Skeleton";

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

// Memoized dentist card for better performance
const DentistCard = memo(function DentistCard({
  dentist,
  onBookAppointment,
  onMouseEnter,
}: {
  dentist: any;
  onBookAppointment: (dentist: any) => void;
  onMouseEnter: () => void;
}) {
  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full"
      onMouseEnter={onMouseEnter}
    >
      <div className="relative">
        <img
          src={dentist.image_url || dentist.image || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&q=80'}
          alt={dentist.name}
          className="w-full h-64 object-cover"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }}
        />
        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="bg-white/90 text-gray-800">
            {dentist.specialization || dentist.speciality || 'General Dentistry'}
          </Badge>
        </div>
      </div>

      <CardHeader>
        <CardTitle className="text-xl">{dentist.name}</CardTitle>
        <CardDescription className="text-lg font-medium text-blue-600">
          {dentist.specialization || dentist.speciality || 'General Dentistry'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col h-full p-6">
        <div className="flex-1 space-y-4">
          <p className="text-gray-600 text-sm leading-relaxed min-h-[3rem]">
            {dentist.bio || "Experienced dental professional dedicated to providing quality care."}
          </p>

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="font-medium">{(dentist.rating || 4.5).toFixed(1)}</span>
              <span className="ml-1">({dentist.reviews || 6} reviews)</span>
            </div>
            <div className="flex items-center">
              <User className="h-4 w-4 mr-1" />
              <span>{dentist.years_of_experience ? `${dentist.years_of_experience} years` : 'Experienced'}</span>
            </div>
          </div>

          {(dentist.address || dentist.phone || dentist.email) && (
            <div className="space-y-2">
              {dentist.address && (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{dentist.address}</span>
                </div>
              )}
              {dentist.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>{dentist.phone}</span>
                </div>
              )}
              {dentist.email && (
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{dentist.email}</span>
                </div>
              )}
            </div>
          )}

          {dentist.expertise && dentist.expertise.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Specializations:</h4>
              <div className="flex flex-wrap gap-1">
                {dentist.expertise.slice(0, 3).map((skill: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 mt-auto border-t">
          <div className="flex space-x-2">
            <Button
              onClick={() => onBookAppointment(dentist)}
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
  );
});

const EnhancedDentists = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedDentist, setSelectedDentist] = useState<any>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Use optimized hooks
  const { data: dentists = [], isLoading } = useDentists();
  const prefetchDentist = usePrefetchDentist();

  // Prefetch all dentists on mount
  usePrefetchAllDentists();

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

        {isLoading ? (
          <CardGridSkeleton count={6} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {dentists.map((dentist: any) => (
              <DentistCard
                key={dentist.id}
                dentist={dentist}
                onBookAppointment={handleBookAppointment}
                onMouseEnter={() => prefetchDentist(dentist.id)}
              />
            ))}
          </div>
        )}

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
