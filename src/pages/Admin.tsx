import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { isAdminEmail } from "@/lib/auth";
import { fetchAllDentists } from "@/lib/admin-queries";
import { Dentist } from "@/types/admin";
import { DentistList } from "@/components/admin/DentistList";
import { DentistDetails } from "@/components/admin/DentistDetails";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, RefreshCw } from "lucide-react";
import { isNetworkError } from "@/lib/error-handling";

const AdminContent = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [selectedDentist, setSelectedDentist] = useState<Dentist | null>(null);
  const [isLoadingDentists, setIsLoadingDentists] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Access control check
  useEffect(() => {
    console.log('[Admin] Access control check:', {
      loading,
      userEmail: user?.email,
      isAdmin: isAdminEmail(user?.email)
    });
    
    if (loading) return;
    
    if (!isAdminEmail(user?.email)) {
      console.log('[Admin] Access denied - redirecting to home');
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin dashboard.",
        variant: "destructive",
      });
      navigate("/", { replace: true });
    } else {
      console.log('[Admin] Access granted for admin user:', user?.email);
    }
  }, [user, loading, navigate, toast]);

  // Fetch dentists on page load
  useEffect(() => {
    if (user && isAdminEmail(user?.email)) {
      loadDentists();
    }
  }, [user]);

  const loadDentists = async () => {
    try {
      setIsLoadingDentists(true);
      setError(null);
      console.log('[Admin] Fetching dentists...');
      const data = await fetchAllDentists();
      console.log('[Admin] Dentists loaded:', data.length);
      setDentists(data);
    } catch (error: any) {
      console.error('[Admin] Error loading dentists:', error);
      
      // Get user-friendly error message
      const errorMessage = error.message || 'Failed to load dentists. Please try again.';
      setError(errorMessage);
      
      // Show toast notification with appropriate message
      toast({
        title: isNetworkError(error) ? "Connection Error" : "Error",
        description: errorMessage,
        variant: "destructive",
        duration: isNetworkError(error) ? 8000 : 5000,
      });
    } finally {
      setIsLoadingDentists(false);
    }
  };

  const handleDentistSelect = (dentist: Dentist) => {
    console.log('[Admin] Dentist selected:', dentist.full_name);
    setSelectedDentist(dentist);
  };

  const handleDentistUpdate = () => {
    console.log('[Admin] Dentist data updated, refreshing list...');
    loadDentists();
  };

  // Loading state
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Error state with retry
  if (error && !isLoadingDentists) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-28 pb-12 container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage dentists and view their information</p>
          </div>
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-lg">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Dashboard</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">{error}</p>
            <button
              onClick={loadDentists}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NetworkStatusIndicator />
      <Navbar />
      <section className="pt-28 pb-12 container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage dentists, view their availability, and monitor patient appointments
          </p>
        </div>

        {/* Responsive Grid Layout: Dentist List + Dentist Details */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Dentist List - Left Column */}
          <div className="md:col-span-1">
            <DentistList
              dentists={dentists}
              onSelect={handleDentistSelect}
              selectedId={selectedDentist?.id}
              isLoading={isLoadingDentists}
            />
          </div>

          {/* Dentist Details - Right Column (2/3 width) */}
          <div className="md:col-span-2">
            {selectedDentist ? (
              <DentistDetails
                dentist={selectedDentist}
                onUpdate={handleDentistUpdate}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-lg bg-muted/20">
                <AlertCircle className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Dentist Selected</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Select a dentist from the list to view their profile, manage their availability,
                  and see their patient appointments.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

const Admin = () => {
  return (
    <ErrorBoundary>
      <AdminContent />
    </ErrorBoundary>
  );
};

export default Admin;


