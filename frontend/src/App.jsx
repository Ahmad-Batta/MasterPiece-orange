import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MotionConfig } from 'motion/react';
import AuthCallbackPage from './pages/AuthCallbackPage';
import DashboardPage from './pages/DashboardPage';
import AdminOverviewPage from './pages/AdminOverviewPage';
import AdminPlaceholderPage from './pages/AdminPlaceholderPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterPage from './pages/RegisterPage';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

function ApplicationRoutes() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t('meta.title');
  }, [t]);

  return (
    <BrowserRouter>
      <a className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-[#2B362E] focus:ring-2 focus:ring-[#A37E5E]" href="#main-content">{t('common.skipToContent')}</a>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/seeker/dashboard" element={<ProtectedRoute role="seeker"><DashboardPage role="seeker" /></ProtectedRoute>} />
        <Route path="/seeker/jobs" element={<ProtectedRoute role="seeker"><DashboardPage role="seeker" /></ProtectedRoute>} />
        <Route path="/company/dashboard" element={<ProtectedRoute role="company"><DashboardPage role="company" /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><DashboardLayout /></ProtectedRoute>}>
          <Route path="dashboard" element={<AdminOverviewPage />} />
          <Route path="users-companies" element={<AdminPlaceholderPage section="usersCompanies" />} />
          <Route path="catalog" element={<AdminPlaceholderPage section="catalog" />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ToastProvider>
          <ApplicationRoutes />
        </ToastProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
