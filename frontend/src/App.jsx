import { lazy, Suspense, useEffect } from 'react';
import { ConfirmProvider } from './components/ConfirmProvider';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
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
const SeekerOverviewPage = lazy(() => import('./pages/SeekerOverviewPage'));
const SeekerProfilePage = lazy(() => import('./pages/SeekerProfilePage'));
const SeekerJobsPage = lazy(() => import('./pages/SeekerJobsPage'));
const SeekerApplicationsPage = lazy(() => import('./pages/SeekerApplicationsPage'));
const SeekerSettingsPage = lazy(() => import('./pages/SeekerSettingsPage'));
const SeekerCvBuilderPage = lazy(() => import('./pages/SeekerCvBuilderPage'));
const CompanyJobsPage = lazy(() => import('./pages/CompanyJobsPage'));
const CompanyProfilePage = lazy(() => import('./pages/CompanyProfilePage'));
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import { AuthProvider, dashboardPath, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { PlatformConfigProvider, usePlatformConfig } from './context/PlatformConfigContext';
import UpgradeModal from './components/UpgradeModal';

function PaymentReturn({ status }) {
  const { session, isLoading } = useAuth();
  const { pathname, search } = useLocation();
  const { t } = useTranslation();
  if (isLoading) return <p role="status" className="p-6">{t('common.loading')}</p>;
  if (!session) return <Navigate to="/login" state={{ from: pathname + search }} replace />;
  return <Navigate to={dashboardPath(session.role)} state={{ billingReturn: status }} replace />;
}

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
      <UpgradeModal />
      {platformConfig.maintenance_enabled && <div role="status" className="border-b border-[#E6D7C8] bg-[#F5EFEA] px-4 py-3 text-center text-sm text-[#8E6B4D]">{platformConfig[`maintenance_message_${document.documentElement.lang === 'ar' ? 'ar' : 'en'}`] || t('auth.maintenanceMessage')}</div>}
      <Suspense fallback={<div className="mx-auto grid max-w-7xl animate-pulse gap-6 p-6" role="status" aria-label={t('common.loading')}><div className="h-10 w-1/3 rounded-lg bg-[#E5E2D9]/60" /><div className="h-64 rounded-xl bg-[#E5E2D9]/60" /></div>}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/seeker" element={<ProtectedRoute role="seeker"><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<SeekerOverviewPage />} />
          <Route path="profile" element={<SeekerProfilePage />} />
          <Route path="cv-builder" element={<SeekerCvBuilderPage />} />
          <Route path="jobs" element={<SeekerJobsPage />} />
          <Route path="applications" element={<SeekerApplicationsPage />} />
          <Route path="settings" element={<SeekerSettingsPage />} />
        </Route>
        <Route path="/company/dashboard" element={<ProtectedRoute role="company"><DashboardPage role="company" /></ProtectedRoute>} />
        <Route path="/company/jobs" element={<ProtectedRoute role="company"><CompanyJobsPage /></ProtectedRoute>} />
        <Route path="/company/profile" element={<ProtectedRoute role="company"><CompanyProfilePage /></ProtectedRoute>} />
        <Route path="/payments/success" element={<PaymentReturn status="returned" />} />
        <Route path="/payments/cancelled" element={<PaymentReturn status="cancelled" />} />
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
