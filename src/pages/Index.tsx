import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Shield, Users, Sparkles, Heart, Clock, MessageCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ChatbotWidget } from "@/components/ChatbotWidget";
import heroImage from "@/assets/hero-dental.jpg";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
        {/* Animated Background */}
        <div className="absolute inset-0 gradient-hero opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(190,100%,50%,0.1),transparent_50%)]" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-slide-up">
              <div className="inline-block">
                <span className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                  ✨ Welcome to DentalCare Connect
                </span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                Your Smile,{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Our Mission
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-lg">
                Connect with skilled dentistry students for quality, affordable dental care. 
                Book your appointment today and take the first step towards a healthier smile.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link to="/auth">
                  <Button size="lg" className="gradient-primary text-primary-foreground transition-bounce hover:scale-105 shadow-aqua-lg text-lg px-8">
                    <Calendar className="w-5 h-5 mr-2" />
                    Book Appointment
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button size="lg" variant="outline" className="border-primary/20 hover:bg-primary/5 text-lg px-8">
                    Contact Us
                  </Button>
                </Link>
              </div>
              
              <div className="flex items-center gap-8 pt-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">500+</div>
                  <div className="text-sm text-muted-foreground">Happy Patients</div>
                </div>
                <div className="h-12 w-px bg-border" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">50+</div>
                  <div className="text-sm text-muted-foreground">Expert Students</div>
                </div>
                <div className="h-12 w-px bg-border" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">98%</div>
                  <div className="text-sm text-muted-foreground">Satisfaction</div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-3xl animate-pulse-glow" />
              <img 
                src={heroImage} 
                alt="Modern dental clinic" 
                className="relative rounded-3xl shadow-aqua-lg w-full h-auto animate-float"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-24 bg-gradient-to-b from-background to-secondary">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Why Choose{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                DentalCare Connect?
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We make quality dental care accessible, affordable, and convenient for everyone.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: "Quality Care",
                description: "All our student dentists are supervised by experienced professionals.",
                color: "from-primary to-accent"
              },
              {
                icon: Users,
                title: "Easy Booking",
                description: "Book appointments with our AI assistant or browse dentist profiles.",
                color: "from-accent to-primary"
              },
              {
                icon: Heart,
                title: "Affordable Prices",
                description: "Get professional dental care at student-friendly prices.",
                color: "from-primary to-accent"
              },
              {
                icon: Clock,
                title: "Flexible Schedule",
                description: "Choose appointment times that work best for your busy schedule.",
                color: "from-accent to-primary"
              },
              {
                icon: Sparkles,
                title: "AI Assistant",
                description: "Get instant help with booking and questions through our smart AI.",
                color: "from-primary to-accent"
              },
              {
                icon: Calendar,
                title: "Track Appointments",
                description: "Manage all your dental appointments in one convenient dashboard.",
                color: "from-accent to-primary"
              }
            ].map((feature, index) => (
              <Card 
                key={index}
                className="gradient-card p-8 border-border/50 hover:shadow-aqua-md transition-smooth hover:-translate-y-2 group"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} p-3 mb-6 group-hover:scale-110 transition-bounce`}>
                  <feature.icon className="w-full h-full text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="max-w-3xl mx-auto space-y-8 animate-slide-up">
            <h2 className="text-4xl md:text-5xl font-bold">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-muted-foreground">
              Join hundreds of satisfied patients who trust DentalCare Connect for their dental needs.
            </p>
            <Link to="/auth">
              <Button size="lg" className="gradient-primary text-primary-foreground transition-bounce hover:scale-105 shadow-aqua-lg text-lg px-12">
                <Calendar className="w-5 h-5 mr-2" />
                Book Your Appointment Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      <Footer />
      <ChatbotWidget />
    </div>
  );
};

export default Index;
