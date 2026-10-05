import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import LoadingScreen from './components/common/LoadingScreen';
import { Toaster } from 'react-hot-toast';

// Lazy Loaded Pages
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage'));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const FiveSCardsPage = lazy(() => import('./features/fives/FiveSCardsPage'));
const AuditsPage = lazy(() => import('./features/audits/AuditsPage'));
const QuickWinsPage = lazy(() => import('./features/quick-wins/QuickWinsPage'));
const A3Page = lazy(() => import('./features/a3/A3Page'));
const VSMPage = lazy(() => import('./features/vsm/VSMPage'));
const ResponsablesPage = lazy(() => import('./features/responsables/ResponsablesPage'));
const ConsultantPage = lazy(() => import('./features/consultant/ConsultantPage'));
const OfflinePage = lazy(() => import('./features/offline/OfflinePage'));
const UsersPage = lazy(() => import('./features/admin/UsersPage'));
const CompaniesPage = lazy(() => import('./features/admin/CompaniesPage'));
const SettingsPage = lazy(() => import('./features/admin/SettingsPage'));

export const App: React.FC = () => {
  // Splash Screen Fade-out
  useEffect(() => {
    const splash = document.getElementById('splash-overlay');
    if (splash) {
      setTimeout(() => {
        splash.style.opacity = '0';
        setTimeout(() => {
          splash.remove();
        }, 400);
      }, 150);
    }
  }, []);

  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #334155',
            borderRadius: '1rem',
            fontSize: '13px',
          },
          success: {
            iconTheme: {
              primary: '#06b6d4',
              secondary: '#0f172a',
            },
          },
        }}
      />
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen message="Cargando estación..." />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/offline" element={<OfflinePage />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="5s" element={<FiveSCardsPage />} />
              <Route path="5s-cards" element={<FiveSCardsPage />} />
              <Route path="auditorias-5s" element={<AuditsPage />} />
              <Route path="5s-audits" element={<AuditsPage />} />
              <Route path="quick-wins" element={<QuickWinsPage />} />
              <Route path="a3" element={<A3Page />} />
              <Route path="a3-projects" element={<A3Page />} />
              <Route path="vsm" element={<VSMPage />} />
              <Route path="responsables" element={<ResponsablesPage />} />
              <Route path="consultant" element={<ConsultantPage />} />

              {/* Admin Routes */}
              <Route
                path="admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/users"
                element={
                  <ProtectedRoute requireAdmin>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/companies"
                element={
                  <ProtectedRoute requireAdmin>
                    <CompaniesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/settings"
                element={
                  <ProtectedRoute requireAdmin>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
