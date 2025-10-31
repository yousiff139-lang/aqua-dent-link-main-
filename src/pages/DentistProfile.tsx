import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BookingForm } from "@/components/BookingForm";
import { BookingConfirmation } from "@/components/BookingConfirmation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useDentist } from "@/hooks/useDentist";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Calendar, AlertCircle } from "lucide-react";
import { DentistAvailabilityDisplay } from "@/components/DentistAvailabilityDisplay";
import { usePerformanceTracking } from "@/hooks/usePerformanceTracking";

// Placeholder image for missing or invalid dentist images
const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800&h=800&fit=crop";

const DentistProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const bookingFormRef = useRef<HTMLDivElement>(null);
  
  // Track page load performance
  usePerformanceTracking('DentistProfile');
  
  // Fetch dentist data from database
  const { data: dentist, isLoading, error } = useDentist(id);
  
  // State for booking confirmation
  const [bookingSuccess, setBookingSuccess] = useState<{
    appointmentId: string;
    date: string;
    time: string;
    paymentMethod: "stripe" | "cash";
    paymentStatus: "pending" | "paid";
  } | null>(null);

  // Log errors to console for debugging
  useEffect(() => {
    if (error) {
      console.error('Error loading dentist profile:', {
        dentistId: id,
        error: error.message,
        stack: error.stack,
      });
    }
  }, [error, id]);

  // Redirect to dentists list if dentist not found
  useEffect(() => {
    if (!isLoading && !dentist && !error) {
      console.warn('Dentist not found, redirecting to dentists list');
      navigate("/dentists", { replace: true });
    }
  }, [isLoading, dentist, error, navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <section className="pt-28 pb-12 container mx-auto px-4">
          <LoadingSpinner size="lg" text="Loading dentist profile..." className="py-20" />
        </section>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <section className="pt-28 pb-12 container mx-auto px-4">
          <Card className="p-8 text-center max-w-md mx-auto">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Unable to Load Profile</h2>
            <p className="text-muted-foreground mb-6">
              We couldn't load this dentist's profile. This might be due to a connection issue or the profile may no longer be available.
            </p>
            <Link to="/dentists">
              <Button>Back to Dentists</Button>
            </Link>
          </Card>
        </section>
        <Footer />
      </div>
    );
  }

  // Not found state (should be handled by redirect, but just in case)
  if (!dentist) {
    return null;
  }

  // Parse education from string to array if needed
  const educationArray = dentist.education 
    ? (typeof dentist.education === 'string' 
        ? dentist.education.split('\n').filter(e => e.trim()) 
        : Array.isArray(dentist.education) 
          ? dentist.education 
          : [dentist.education])
    : [];

  // Parse expertise array
  const expertiseArray = dentist.expertise || [];

  // Handle image URL with placeholder fallback
  const dentistImage = dentist.image_url || PLACEHOLDER_IMAGE;
  
  // Handle image load errors
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.warn('Failed to load dentist image, using placeholder:', dentist.image_url);
    e.currentTarget.src = PLACEHOLDER_IMAGE;
  };

  // Smooth scroll to booking form
  const scrollToBookingForm = () => {
    bookingFormRef.current?.scrollIntoView({ 
      behavior: "smooth", 
      block: "start" 
    });
  };

  // Handle successful booking
  const handleBookingSuccess = (data: {
    appointmentId: string;
    date: string;
    time: string;
    paymentMethod: "stripe" | "cash";
    paymentStatus: "pending" | "paid";
  }) => {
    setBookingSuccess(data);
    
    // Scroll to top to show confirmation
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Chatbot functionality removed - will be reimplemented

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="pt-28 pb-12 container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="overflow-hidden aspect-square">
            <img 
              src={dentistImage} 
              alt={dentist.name} 
              className="w-full h-full object-cover" 
              onError={handleImageError}
            />
          </Card>
          <div>
            <h1 className="text-4xl font-bold mb-2">{dentist.name}</h1>
            <p className="text-primary font-medium mb-4">{dentist.specialization || "General Dentistry"}</p>
            <div className="flex items-center gap-2 mb-4">
              <div className="text-yellow-500 text-lg">
                {"★".repeat(Math.floor(dentist.rating))}
                {dentist.rating % 1 >= 0.5 ? "½" : ""}
                {"☆".repeat(5 - Math.ceil(dentist.rating))}
              </div>
              <span className="text-sm text-muted-foreground">
                {dentist.rating.toFixed(1)} rating
              </span>
            </div>
            <p className="text-muted-foreground mb-6">{dentist.bio || "Experienced dental professional dedicated to providing quality care."}</p>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {educationArray.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Education</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {educationArray.map((e, i) => (<li key={i}>{e}</li>))}
                  </ul>
                </Card>
              )}
              {expertiseArray.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Expertise</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {expertiseArray.map((e, i) => (<li key={i}>{e}</li>))}
                  </ul>
                </Card>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                className="gradient-primary text-primary-foreground flex-1 sm:flex-none"
                onClick={scrollToBookingForm}
                size="lg"
              >
                <Calendar className="w-5 h-5 mr-2" /> Book Appointment
              </Button>
              <Link to="/dentists">
                <Button variant="outline" className="w-full sm:w-auto">Back to Dentists</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Availability Schedule */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-4">Availability Schedule</h2>
          <DentistAvailabilityDisplay dentistId={dentist.id} />
        </div>

        {/* Reviews section - placeholder for future implementation */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-4">Patient Reviews</h2>
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">
              Patient reviews will be available soon. Book an appointment to be one of the first to leave a review!
            </p>
          </Card>
        </div>

        {/* Booking Section */}
        <div ref={bookingFormRef} className="mt-16 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 text-center">Book Your Appointment</h2>
          
          {bookingSuccess ? (
            <BookingConfirmation
              appointmentId={bookingSuccess.appointmentId}
              dentistName={dentist.name}
              date={bookingSuccess.date}
              time={bookingSuccess.time}
              paymentMethod={bookingSuccess.paymentMethod}
              paymentStatus={bookingSuccess.paymentStatus}
            />
          ) : (
            <BookingForm
              dentistId={dentist.id}
              dentistName={dentist.name}
              dentistEmail={dentist.email}
              onSuccess={handleBookingSuccess}
            />
          )}
        </div>
      </section>
      <Footer />

      {/* Chatbot will be added here */}
    </div>
  );
};

export default DentistProfile;
