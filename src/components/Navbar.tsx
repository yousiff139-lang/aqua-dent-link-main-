import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const Navbar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [isDentist, setIsDentist] = useState(false);

  useEffect(() => {
    const checkDentistRole = async () => {
      if (!user) {
        setIsDentist(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'dentist')
          .maybeSingle();

        setIsDentist(!!data);
      } catch (error) {
        console.error('Error checking dentist role:', error);
      }
    };

    checkDentistRole();
  }, [user]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-lg border-b border-border z-50 transition-smooth">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-gradient-primary p-2 rounded-lg transition-bounce group-hover:scale-110">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              DentalCare Connect
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className={`transition-smooth hover:text-primary ${isActive('/') ? 'text-primary font-semibold' : 'text-foreground'}`}
            >
              Home
            </Link>
            <Link
              to="/dentists"
              className={`transition-smooth hover:text-primary ${isActive('/dentists') ? 'text-primary font-semibold' : 'text-foreground'}`}
            >
              Dentists
            </Link>
            <Link
              to="/services"
              className={`transition-smooth hover:text-primary ${isActive('/services') ? 'text-primary font-semibold' : 'text-foreground'}`}
            >
              Services
            </Link>
            <Link
              to="/contact"
              className={`transition-smooth hover:text-primary ${isActive('/contact') ? 'text-primary font-semibold' : 'text-foreground'}`}
            >
              Contact
            </Link>
            {user && !isDentist && (
              <Link
                to="/dashboard"
                className={`transition-smooth hover:text-primary ${isActive('/dashboard') ? 'text-primary font-semibold' : 'text-foreground'}`}
              >
                Dashboard
              </Link>
            )}
            {user && isDentist && (
              <Link
                to="/dentist-dashboard"
                className={`transition-smooth hover:text-primary ${isActive('/dentist-dashboard') ? 'text-primary font-semibold' : 'text-foreground'}`}
              >
                Dentist Dashboard
              </Link>
            )}
          </div>

          {!user ? (
            <div className="flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost" className="transition-smooth hover:bg-primary/10">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth">
                <Button className="gradient-primary text-primary-foreground transition-bounce hover:scale-105 shadow-aqua-md">
                  Get Started
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="transition-smooth"
                onClick={async () => { await supabase.auth.signOut(); }}
              >
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
