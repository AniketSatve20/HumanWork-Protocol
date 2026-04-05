import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from '@/components/layout';
import {
  LandingPage,
  RegisterPage,
  DashboardPage,
  JobsPage,
  JobDetailPage,
  CreateJobPage,
  MessagesPage,
  SettingsPage,
  SkillsPage,
  DisputesPage,
  UserProfilePage,
  JobManagePage,
  KycPage,
} from '@/pages';
import { useAuthStore } from '@/context/authStore';
import { SoundProvider, MuteToggle } from '@/components/ui/SoundSystem';
import NeonCursor from '@/components/ui/NeonCursor';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

// Auth Route wrapper (redirect if already authenticated)
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  
  if (isAuthenticated && user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

export function App() {
  return (
    <SoundProvider>
    <BrowserRouter>
      <NeonCursor />
      <MuteToggle />
      <Toaster
        position="top-right"
        containerStyle={{ top: 72 }}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0D0D0D',
            color: '#ecedf2',
            borderRadius: '0',
            padding: '14px 16px',
            border: '1px solid rgba(255, 184, 0, 0.15)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 15px rgba(255, 184, 0, 0.08)',
            backdropFilter: 'blur(20px)',
            fontSize: '14px',
            maxWidth: '380px',
          },
          success: {
            iconTheme: {
              primary: '#4ade80',
              secondary: '#0D0D0D',
            },
            style: {
              border: '1px solid rgba(34, 197, 94, 0.2)',
            },
          },
          error: {
            iconTheme: {
              primary: '#f87171',
              secondary: '#0D0D0D',
            },
            style: {
              border: '1px solid rgba(239, 68, 68, 0.2)',
            },
          },
          loading: {
            iconTheme: {
              primary: '#FFB800',
              secondary: '#0D0D0D',
            },
            style: {
              border: '1px solid rgba(255, 184, 0, 0.2)',
            },
          },
        }}
      />
      
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/register"
          element={
            <AuthRoute>
              <RegisterPage />
            </AuthRoute>
          }
        />

        {/* Protected routes with layout */}
        <Route element={<Layout />}>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/jobs" element={<JobsPage />} />
          <Route
            path="/jobs/manage"
            element={
              <ProtectedRoute>
                <JobManagePage />
              </ProtectedRoute>
            }
          />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route
            path="/jobs/create"
            element={
              <ProtectedRoute>
                <CreateJobPage />
              </ProtectedRoute>
            }
          />
          <Route path="/search" element={<JobsPage />} />
          <Route path="/users/:address" element={<UserProfilePage />} />
          <Route
            path="/skills"
            element={
              <ProtectedRoute>
                <SkillsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/disputes"
            element={
              <ProtectedRoute>
                <DisputesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kyc"
            element={
              <ProtectedRoute>
                <KycPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </SoundProvider>
  );
}

export default App;
