import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Calendar, Eye, User, MapPin, Phone, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { EnhancedBookingForm } from "@/components/EnhancedBookingForm";

const EnhancedDentists = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDentist, setSelectedDentist] = useState<any>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);

  const dentists = [
    {
      id: "550e8400-e29b-41d4-a716-446655440001",
      name: "Dr. Sarah Johnson",
      speciality: "General Dentistry",
      bio: "Experienced general dentist with focus on preventive care and patient comfort. Specializes in routine cleanings, fillings, and oral health maintenance.",
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop",
      rating: 4.8,
      reviews: 127,
      experience: "10 years",
      education: "DDS from Harvard University",
      phone: "+1-555-0101",
      email: "sarah.johnson@example.com",
      address: "123 Main St, City, State",
      expertise: ["Preventive Care", "Restorative Dentistry", "Oral Health"]
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440002",
      name: "Dr. Michael Chen",
      speciality: "Orthodontics",
      bio: "Specialist in orthodontic treatments and braces. Expert in creating beautiful, straight smiles with the latest techniques.",
      image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop",
      rating: 4.9,
      reviews: 98,
      experience: "15 years",
      education: "DDS from Stanford University, Orthodontics Residency",
      phone: "+1-555-0102",
      email: "michael.chen@example.com",
      address: "456 Oak Ave, City, State",
      expertise: ["Braces", "Invisalign", "Jaw Surgery"]
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440003",
      name: "Dr. Emily Rodriguez",
      speciality: "Pediatric Dentistry",
      bio: "Dedicated to children's dental health and comfort. Specializes in making dental visits fun and stress-free for young patients.",
      image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop",
      rating: 4.7,
      reviews: 145,
      experience: "8 years",
      education: "DDS from UCLA, Pediatric Dentistry Fellowship",
      phone: "+1-555-0103",
      email: "emily.rodriguez@example.com",
      address: "789 Pine St, City, State",
      expertise: ["Child Dental Care", "Sedation Dentistry", "Preventive Care"]
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440004",
      name: "Dr. James Wilson",
      speciality: "Oral Surgery",
      bio: "Expert in complex oral and maxillofacial surgeries. Specializes in wisdom teeth removal, dental implants, and reconstructive procedures.",
      image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop",
      rating: 4.6,
      reviews: 89,
      experience: "12 years",
      education: "DDS from Columbia University, Oral Surgery Residency",
      phone: "+1-555-0104",
      email: "james.wilson@example.com",
      address: "321 Elm St, City, State",
      expertise: ["Wisdom Teeth", "Implants", "Jaw Surgery"]
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440005",
      name: "Dr. Lisa Thompson",
      speciality: "Cosmetic Dentistry",
      bio: "Specialist in cosmetic and aesthetic dental treatments. Expert in smile makeovers, veneers, and teeth whitening procedures.",
      image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=400&fit=crop",
      rating: 4.9,
      reviews: 156,
      experience: "14 years",
      education: "DDS from NYU, Cosmetic Dentistry Fellowship",
      phone: "+1-555-0105",
      email: "lisa.thompson@example.com",
      address: "654 Maple Dr, City, State",
      expertise: ["Veneers", "Teeth Whitening", "Smile Design"]
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440006",
      name: "Dr. Robert Brown",
      speciality: "Endodontics",
      bio: "Root canal specialist with advanced techniques. Focuses on saving teeth and providing pain-free endodontic treatments.",
      image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop",
      rating: 4.8,
      reviews: 112,
      experience: "11 years",
      education: "DDS from University of Michigan, Endodontics Residency",
      phone: "+1-555-0106",
      email: "robert.brown@example.com",
      address: "987 Cedar Ln, City, State",
      expertise: ["Root Canals", "Endodontic Surgery", "Pain Management"]
    }
  ];

  const handleBookAppointment = (dentist: any) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setSelectedDentist(dentist);
    setShowBookingForm(true);
  };

  const handleBookingSuccess = () => {
    setShowBookingForm(false);
    setSelectedDentist(null);
  };

  if (showBookingForm && selectedDentist) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => setShowBookingForm(false)}
              className="mb-4"
            >
              ← Back to Dentists
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">
              Book Appointment with {selectedDentist.name}
            </h1>
            <p className="text-gray-600 mt-2">
              Complete the form below to schedule your dental appointment
            </p>
          </div>
          
          <EnhancedBookingForm
            dentistId={selectedDentist.id}
            dentistName={selectedDentist.name}
            dentistEmail={selectedDentist.email}
            onSuccess={handleBookingSuccess}
          />
        </div>
        <Footer />
      </div>
    );
  }

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
    </div>
  );
};

export default EnhancedDentists;
