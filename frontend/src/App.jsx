import { lazy, Suspense, useEffect } from 'react';
import { ConfirmProvider } from './components/ConfirmProvider';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MotionConfig } from 'motion/react';
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AdminOverviewPage = lazy(() => import('./pages/AdminOverviewPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const AdminCompaniesPage = lazy(() => import('./pages/AdminCompaniesPage'));
const AdminCatalogPage = lazy(() => import('./pages/AdminCatalogPage'));
const AdminJobsPage = lazy(() => import('./pages/AdminJobsPage'));
const AdminPaymentsPage = lazy(() => import('./pages/AdminPaymentsPage'));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { PlatformConfigProvider, usePlatformConfig } from './context/PlatformConfigContext';

function ApplicationRoutes() {
  const { t } = useTranslation();
  const platformConfig = usePlatformConfig();

  useEffect(() => {
    document.title = t('meta.title');
  }, [t]);

  return (
    <BrowserRouter>
      <a className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-[#2B362E] focus:ring-2 focus:ring-[#A37E5E]" href="#main-content">{t('common.skipToContent')}</a>
      <Navbar />
      {platformConfig.maintenance_enabled && <div role="status" className="border-b border-[#E6D7C8] bg-[#F5EFEA] px-4 py-3 text-center text-sm text-[#8E6B4D]">{platformConfig[`maintenance_message_${document.documentElement.lang === 'ar' ? 'ar' : 'en'}`] || t('auth.maintenanceMessage')}</div>}
      <Suspense fallback={<div className="mx-auto grid max-w-7xl animate-pulse gap-6 p-6" role="status" aria-label={t('common.loading')}><div className="h-10 w-1/3 rounded-lg bg-[#E5E2D9]/60" /><div className="h-64 rounded-xl bg-[#E5E2D9]/60" /></div>}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/seeker/dashboard" element={<ProtectedRoute role="seeker"><DashboardPage role="seeker" /></ProtectedRoute>} />
        <Route path="/seeker/jobs" element={<ProtectedRoute role="seeker"><DashboardPage role="seeker" /></ProtectedRoute>} />
        <Route path="/company/dashboard" element={<ProtectedRoute role="company"><DashboardPage role="company" /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="dashboard" element={<Navigate to="/admin" replace />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="companies" element={<AdminCompaniesPage />} />
          <Route path="users-companies" element={<Navigate to="/admin/users" replace />} />
          <Route path="catalog" element={<AdminCatalogPage />} />
          <Route path="jobs" element={<AdminJobsPage />} />
          <Route path="payments" element={<AdminPaymentsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ToastProvider>
          <PlatformConfigProvider><ConfirmProvider><ApplicationRoutes /></ConfirmProvider></PlatformConfigProvider>
        </ToastProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
