import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MapPin, Phone, Mail, Clock, User, MessageSquare } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().trim().email("Invalid email address").max(255, "Email too long"),
  phone: z.string().trim().max(20, "Phone number too long").optional(),
  message: z.string().trim().min(1, "Message is required").max(1000, "Message too long"),
});

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string || undefined,
      message: formData.get('message') as string,
    };

    // Validate input
    const result = contactSchema.safeParse(data);
    if (!result.success) {
      toast({
        title: "Validation Error",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Message sent!",
        description: "We'll get back to you within 24 hours.",
      });
      e.currentTarget.reset();
    }, 1500);
  };
  
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <section className="pt-32 pb-16 bg-gradient-to-b from-secondary to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-slide-up">
            <h1 className="text-5xl font-bold mb-4">
              Get in{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Touch
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <div className="space-y-8">
              <Card className="gradient-card p-8 border-border/50 hover:shadow-aqua-md transition-smooth">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input 
                        id="name" 
                        name="name"
                        placeholder="John Doe" 
                        required
                        maxLength={100}
                        className="pl-10 transition-smooth focus:shadow-aqua-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input 
                        id="email" 
                        name="email"
                        type="email" 
                        placeholder="you@example.com" 
                        required
                        maxLength={255}
                        className="pl-10 transition-smooth focus:shadow-aqua-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input 
                        id="phone" 
                        name="phone"
                        type="tel" 
                        placeholder="+1 (555) 123-4567"
                        maxLength={20}
                        className="pl-10 transition-smooth focus:shadow-aqua-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                      <Textarea 
                        id="message" 
                        name="message"
                        placeholder="Tell us how we can help you..." 
                        required
                        maxLength={1000}
                        rows={5}
                        className="pl-10 transition-smooth focus:shadow-aqua-sm resize-none"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full gradient-primary text-primary-foreground transition-bounce hover:scale-105 shadow-aqua-md"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </Card>
            </div>
            
            <div className="space-y-6">
              <Card className="gradient-card p-8 border-border/50 hover:shadow-aqua-md transition-smooth group">
                <div className="flex items-start gap-4">
                  <div className="gradient-primary p-3 rounded-2xl group-hover:scale-110 transition-bounce flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Visit Us</h3>
                    <p className="text-muted-foreground">
                      123 Dental Street<br />
                      Medical District<br />
                      City, State 12345
                    </p>
                  </div>
                </div>
              </Card>
              
              <Card className="gradient-card p-8 border-border/50 hover:shadow-aqua-md transition-smooth group">
                <div className="flex items-start gap-4">
                  <div className="bg-gradient-to-br from-accent to-primary p-3 rounded-2xl group-hover:scale-110 transition-bounce flex items-center justify-center">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Call Us</h3>
                    <p className="text-muted-foreground mb-1">
                      Main: +1 (555) 123-4567
                    </p>
                    <p className="text-muted-foreground">
                      Emergency: +1 (555) 987-6543
                    </p>
                  </div>
                </div>
              </Card>
              
              <Card className="gradient-card p-8 border-border/50 hover:shadow-aqua-md transition-smooth group">
                <div className="flex items-start gap-4">
                  <div className="gradient-primary p-3 rounded-2xl group-hover:scale-110 transition-bounce flex items-center justify-center">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Email Us</h3>
                    <p className="text-muted-foreground mb-1">
                      info@dentalcare.com
                    </p>
                    <p className="text-muted-foreground">
                      support@dentalcare.com
                    </p>
                  </div>
                </div>
              </Card>
              
              <Card className="gradient-card p-8 border-border/50 hover:shadow-aqua-md transition-smooth group">
                <div className="flex items-start gap-4">
                  <div className="bg-gradient-to-br from-accent to-primary p-3 rounded-2xl group-hover:scale-110 transition-bounce flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Office Hours</h3>
                    <div className="space-y-1 text-muted-foreground">
                      <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                      <p>Saturday: 10:00 AM - 4:00 PM</p>
                      <p>Sunday: Closed</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Contact;
