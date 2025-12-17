import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import ProtectedRoute from '@/components/ProtectedRoute';

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

// Critical pages - load immediately
import Login from '@/pages/Login';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Lazy load non-critical pages for better code splitting
const Profile = lazy(() => import('@/pages/Profile'));
const AvailableTimes = lazy(() => import('@/pages/AvailableTimes'));
const Patients = lazy(() => import('@/pages/Patients'));
const Appointments = lazy(() => import('@/pages/Appointments'));
const XRayLab = lazy(() => import('@/pages/XRayLab'));
const Developers = lazy(() => import('@/pages/Developers'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function AppContent() {
  useNetworkStatus();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/profile" replace />} />
            <Route path="profile" element={<Profile />} />
            <Route path="availability" element={<AvailableTimes />} />
            <Route path="patients" element={<Patients />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="xray-lab" element={<XRayLab />} />
            <Route path="developers" element={<Developers />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
