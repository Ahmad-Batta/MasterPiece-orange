import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth, dashboardPath } from '../context/AuthContext';

function AuthSkeleton() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" aria-busy="true" aria-label={t('common.loading')}>
      <div className="surface-card animate-pulse">
        <div className="h-6 w-48 rounded-lg bg-[#E5E2D9]/60" />
        <div className="mt-6 h-4 max-w-prose rounded-lg bg-[#E5E2D9]/60" />
        <div className="mt-3 h-4 max-w-prose rounded-lg bg-[#E5E2D9]/60" />
      </div>
    </main>
  );
}

export default function ProtectedRoute({ role, children }) {
  const { session, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthSkeleton />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (session.role !== role) return <Navigate to={dashboardPath(session.role)} replace />;
  return children;
}
