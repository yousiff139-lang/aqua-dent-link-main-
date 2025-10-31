import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Star, Calendar, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { useDentists } from "@/hooks/useDentists";

const Dentists = () => {
  const { data: dentists, isLoading, error } = useDentists();

  // Placeholder image for dentists without image_url
  const placeholderImage = "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800&h=800&fit=crop";
  
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <section className="pt-32 pb-16 bg-gradient-to-b from-secondary to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-slide-up">
            <h1 className="text-5xl font-bold mb-4">
              Meet Our{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Dental Experts
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose from our team of skilled dentistry students, all supervised by experienced professionals.
            </p>
          </div>
          
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-lg text-muted-foreground">Loading dentists...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-md text-center">
                <h3 className="text-lg font-semibold text-destructive mb-2">Unable to Load Dentists</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We're having trouble loading the dentist list. Please try again later.
                </p>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && dentists && dentists.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="bg-secondary/50 border border-border rounded-lg p-8 max-w-md text-center">
                <h3 className="text-xl font-semibold mb-2">No Dentists Available</h3>
                <p className="text-muted-foreground">
                  We don't have any dentists available at the moment. Please check back later.
                </p>
              </div>
            </div>
          )}

          {/* Dentists Grid */}
          {!isLoading && !error && dentists && dentists.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {dentists.map((dentist, index) => (
                <Card 
                  key={dentist.id}
                  className="gradient-card overflow-hidden border-border/50 hover:shadow-aqua-lg transition-smooth hover:-translate-y-2 group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="relative overflow-hidden aspect-square">
                    <img 
                      src={dentist.image_url || placeholderImage} 
                      alt={dentist.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-smooth"
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        e.currentTarget.src = placeholderImage;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-semibold">{dentist.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-1">{dentist.name}</h3>
                    <p className="text-sm text-primary font-medium mb-3">
                      {dentist.specialization || "General Dentistry"}
                    </p>
                    <p className="text-sm text-muted-foreground mb-6 line-clamp-3">
                      {dentist.bio || "Experienced dental professional dedicated to providing quality care."}
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <Link to={`/dentist/${dentist.id}`}>
                        <Button variant="outline" className="w-full">View Profile</Button>
                      </Link>
                      <Link to={`/dentist/${dentist.id}`}>
                        <Button className="w-full gradient-primary text-primary-foreground transition-bounce hover:scale-105">
                          <Calendar className="w-4 h-4 mr-2" />
                          Book Now
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Dentists;
