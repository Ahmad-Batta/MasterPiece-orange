import { useEffect, useState } from 'react';
import { ArrowUpRight, CircleAlert } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dashboardPath, useAuth } from '../context/AuthContext';

export default function AuthCallbackPage() {
  const { t } = useTranslation();
  const { completeOAuth } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    document.title = t('auth.callbackTitle');
    const token = searchParams.get('token');
    window.history.replaceState({}, document.title, '/auth/callback');
    if (!token) {
      setHasError(true);
      return;
    }
    completeOAuth(token)
      .then((session) => navigate(dashboardPath(session.role), { replace: true }))
      .catch(() => setHasError(true));
  }, [completeOAuth, navigate, searchParams, t]);

  return (
    <main id="main-content" className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <section className="surface-card w-full max-w-lg text-center">
        {hasError ? (
          <>
            <CircleAlert className="mx-auto h-8 w-8 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" />
            <h1 className="mt-5 font-display text-2xl font-semibold text-[#2B362E]">{t('auth.callbackError')}</h1>
            <Link className="button-primary mt-6" to="/login">{t('auth.loginSubmit')}<ArrowUpRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.75} aria-hidden="true" /></Link>
          </>
        ) : (
          <>
            <div className="mx-auto h-12 w-12 animate-pulse rounded-xl bg-[#E5E2D9]/60" aria-hidden="true" />
            <h1 className="mt-5 font-display text-2xl font-semibold text-[#2B362E]">{t('auth.callbackTitle')}</h1>
            <p className="mx-auto mt-3 max-w-prose text-sm leading-relaxed text-[#1C221E]">{t('auth.callbackBody')}</p>
          </>
        )}
      </section>
    </main>
  );
}
