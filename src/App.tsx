import { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

// Loading component for suspense fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
    <div className="text-center">
      <div className="relative w-16 h-16 mx-auto mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
        <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
      </div>
      <p className="text-gray-600 text-sm animate-pulse">Loading...</p>
    </div>
  </div>
);

// Lazy load pages for better code splitting
// Critical pages - load immediately
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy load non-critical pages
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const DentistDashboard = lazy(() => import("./pages/DentistDashboard"));
const EnhancedDentistDashboard = lazy(() => import("./pages/EnhancedDentistDashboard"));
const DentistPortal = lazy(() => import("./pages/DentistPortal"));
const Dentists = lazy(() => import("./pages/Dentists"));
const EnhancedDentists = lazy(() => import("./pages/EnhancedDentists"));
const Services = lazy(() => import("./pages/Services"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Admin = lazy(() => import("./pages/Admin"));
const EnhancedAdmin = lazy(() => import("./pages/EnhancedAdmin"));
const DentistProfile = lazy(() => import("./pages/DentistProfile"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancel = lazy(() => import("./pages/PaymentCancel"));
const MyAppointments = lazy(() => import("./pages/MyAppointments"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const PerformanceDashboard = lazy(() =>
  import("./components/PerformanceDashboard").then(m => ({ default: m.PerformanceDashboard }))
);

// Optimized QueryClient with aggressive caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 10 * 60 * 1000, // 10 minutes - data stays fresh longer
      gcTime: 30 * 60 * 1000, // 30 minutes cache time
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
  },
});

function AppContent() {
  useNetworkStatus();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin" element={<ProtectedRoute><EnhancedAdmin /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile-settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
        <Route path="/dentist-dashboard" element={<ProtectedRoute><EnhancedDentistDashboard /></ProtectedRoute>} />
        <Route path="/dentist-portal" element={<ProtectedRoute><DentistPortal /></ProtectedRoute>} />
        <Route path="/dentist/:id" element={<DentistProfile />} />
        <Route path="/dentists" element={<EnhancedDentists />} />
        <Route path="/services" element={<Services />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/my-appointments" element={<ProtectedRoute><MyAppointments /></ProtectedRoute>} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-cancel" element={<PaymentCancel />} />
        <Route path="/performance" element={<ProtectedRoute><PerformanceDashboard /></ProtectedRoute>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
