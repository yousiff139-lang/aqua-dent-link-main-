import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign, Star, Calendar } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ServiceBookingModal } from "@/components/ServiceBookingModal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface DentalService {
    id: string;
    name: string;
    description: string;
    specialty: string;
    duration_minutes: number;
    price_min: number;
    price_max: number | null;
    image_url: string | null;
    is_active: boolean;
}

interface Dentist {
    id: string;
    name: string;
    email: string;
    specialization: string;
    rating?: number;
    image_url?: string;
}

const Services = () => {
    const [services, setServices] = useState<DentalService[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedService, setSelectedService] = useState<DentalService | null>(null);
    const [selectedDentist, setSelectedDentist] = useState<Dentist | null>(null);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            const { data, error } = await (supabase as any)
                .from('dental_services')
                .select('*')
                .eq('is_active', true)
                .order('price_min', { ascending: true });

            if (error) throw error;
            setServices(data || []);
        } catch (error) {
            console.error('Error fetching services:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBookService = async (service: DentalService) => {
        if (!user) {
            toast({
                title: "Sign in required",
                description: "Please sign in to book a service.",
                variant: "default",
            });
            navigate('/auth');
            return;
        }

        setSelectedService(service);

        // Fetch dentists with matching specialty - auto-select first one
        try {
            const { data, error } = await (supabase as any)
                .from('dentists')
                .select('*')
                .eq('specialization', service.specialty)
                .eq('status', 'active')
                .limit(1);

            if (error) throw error;

            if (data && data.length > 0) {
                const dentist = data[0];
                setSelectedDentist({
                    id: dentist.id,
                    name: dentist.name || 'Unknown',
                    email: dentist.email || '',
                    specialization: dentist.specialization || service.specialty,
                    rating: dentist.rating,
                    image_url: dentist.image_url,
                });
                setShowBookingModal(true);
            } else {
                toast({
                    title: "No dentist available",
                    description: `No ${service.specialty} specialist is available for ${service.name} at the moment.`,
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error fetching specialized dentists:', error);
            toast({
                title: "Error",
                description: "Failed to find a dentist for this service. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleBookingSuccess = (data: {
        appointmentId: string;
        date: string;
        time: string;
        paymentMethod: "stripe" | "cash";
        paymentStatus: "pending" | "paid";
    }) => {
        setShowBookingModal(false);
        setSelectedService(null);
        setSelectedDentist(null);
        toast({
            title: "Service booked!",
            description: `Your ${selectedService?.name} appointment has been confirmed for ${data.date} at ${data.time}.`,
        });
    };

    const formatPrice = (min: number, max: number | null) => {
        if (!max || min === max) {
            return `$${min.toFixed(0)}`;
        }
        return `$${min.toFixed(0)} - $${max.toFixed(0)}`;
    };

    const formatDuration = (minutes: number) => {
        if (minutes < 60) {
            return `${minutes} min`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins === 0 ? `${hours} hr` : `${hours}h ${mins}m`;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading services...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-12 pt-24">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">Our Dental Services</h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Professional dental care tailored to your needs. Book appointments with specialized dentists for each service.
                    </p>
                </div>

                {/* Services Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service) => (
                        <Card key={service.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                            {/* Service Image */}
                            <div className="relative h-48 bg-gradient-to-br from-blue-500 to-blue-600 overflow-hidden">
                                {service.image_url ? (
                                    <img
                                        src={service.image_url}
                                        alt={service.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Star className="h-16 w-16 text-white/50" />
                                    </div>
                                )}
                                <div className="absolute top-4 right-4">
                                    <Badge variant="secondary" className="bg-white/90 backdrop-blur">
                                        {service.specialty}
                                    </Badge>
                                </div>
                            </div>

                            <CardHeader>
                                <CardTitle className="text-xl">{service.name}</CardTitle>
                                <CardDescription className="line-clamp-2">
                                    {service.description}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {/* Service Details */}
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="h-4 w-4" />
                                        <span>{formatDuration(service.duration_minutes)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 font-semibold text-primary">
                                        <DollarSign className="h-4 w-4" />
                                        <span>{formatPrice(service.price_min, service.price_max)}</span>
                                    </div>
                                </div>

                                {/* Book Button */}
                                <Button
                                    className="w-full"
                                    onClick={() => handleBookService(service)}
                                >
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Book This Service
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Service Booking Modal */}
                {selectedService && selectedDentist && (
                    <ServiceBookingModal
                        open={showBookingModal}
                        onOpenChange={setShowBookingModal}
                        service={selectedService}
                        dentist={selectedDentist}
                        onSuccess={handleBookingSuccess}
                    />
                )}
            </main>

            <Footer />
        </div>
    );
};

export default Services;
