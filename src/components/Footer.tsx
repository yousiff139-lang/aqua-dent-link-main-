import { Link } from "react-router-dom";
import { Sparkles, Mail, Phone, MapPin } from "lucide-react";
import DeveloperCard from "./DeveloperCard";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-b from-background to-secondary border-t border-border">
      <div className="container mx-auto px-4 py-12">
        {/* Developer Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-4 gradient-text">Meet the Developers</h2>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            This platform was crafted with passion and expertise by our talented team, 
            dedicated to creating innovative healthcare solutions.
          </p>
          <DeveloperCard />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-gradient-primary p-2 rounded-lg">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">DentalCare Connect</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Connecting patients with skilled dentistry students for quality, affordable dental care.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-smooth text-sm">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/dentists" className="text-muted-foreground hover:text-primary transition-smooth text-sm">
                  Our Dentists
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary transition-smooth text-sm">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Services</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>General Checkup</li>
              <li>Teeth Cleaning</li>
              <li>Cavity Treatment</li>
              <li>Cosmetic Dentistry</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Contact Info</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4 text-primary" />
                +1 (555) 123-4567
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 text-primary" />
                info@dentalcare.com
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                123 Dental St, City
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 DentalCare Connect. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
