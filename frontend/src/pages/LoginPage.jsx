import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, LockKeyhole } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '../components/Button';
import FormField from '../components/FormField';
import GoogleAuthLink from '../components/GoogleAuthLink';
import AuthVisualPanel from '../components/AuthVisualPanel';
import { dashboardPath, useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, session, isLoading } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = t('auth.loginTitle');
  }, [t]);

  if (!isLoading && session) return <Navigate to={dashboardPath(session.role)} replace />;

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setMessage('');
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!values.email.trim()) nextErrors.email = t('validation.required');
    else if (!/^\S+@\S+\.\S+$/.test(values.email)) nextErrors.email = t('validation.email');
    if (!values.password) nextErrors.password = t('validation.required');
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setMessage(t('auth.reviewFields'));
      return;
    }

    setSubmitting(true);
    setErrors({});
    setMessage('');
    try {
      const nextSession = await login(values);
      notify(t('auth.loginSuccess'));
      const requestedPath = location.state?.from;
      navigate(requestedPath || dashboardPath(nextSession.role), { replace: true });
    } catch (error) {
      if (error.response?.status === 422) {
        const fields = error.response.data?.errors || {};
        setErrors(Object.fromEntries(Object.keys(fields).map((field) => [field, t('auth.reviewFields')])));
        setMessage(t('auth.reviewFields'));
      } else {
        setMessage(t('auth.invalidCredentials'));
      }
      notify(t('auth.invalidCredentials'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:min-h-[calc(100vh-9rem)] lg:grid-cols-2">
        <section className="flex items-center rounded-xl border border-[#E5E2D9] bg-white p-6 shadow-sm">
          <motion.div className="mx-auto w-full max-w-md" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="mb-8 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#2B362E] text-white"><LockKeyhole className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" /></span>
              <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-[#2B362E] sm:text-4xl">{t('auth.loginTitle')}</h1>
              <p className="mx-auto mt-3 max-w-prose text-sm leading-relaxed text-[#1C221E] sm:text-base">{t('auth.loginBody')}</p>
            </div>
            <p className="mb-6 rounded-lg border border-[#E5E2D9] bg-[#FAF9F5] p-4 text-sm leading-relaxed text-[#1C221E]">{t('auth.unifiedNote')}</p>
            <form className="flex flex-col space-y-3.5" onSubmit={submit} noValidate>
              <FormField label={t('auth.email')} name="email" type="email" autoComplete="email" placeholder={t('auth.emailPlaceholder')} value={values.email} onChange={update('email')} error={errors.email} required />
              <FormField label={t('auth.password')} name="password" type="password" autoComplete="current-password" placeholder={t('auth.passwordPlaceholder')} value={values.password} onChange={update('password')} error={errors.password} required />
              <AnimatePresence initial={false}>{message && <motion.p key="login-alert" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="rounded-lg border border-[#E5E2D9] bg-[#FAF9F5] p-4 text-sm leading-relaxed text-[#1C221E]" role="alert">{message}</motion.p>}</AnimatePresence>
              <Button type="submit" loading={submitting} className="w-full">{t('auth.loginSubmit')}<ArrowUpRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.75} aria-hidden="true" /></Button>
            </form>
            <div className="my-6 flex items-center gap-4" aria-hidden="true">
              <span className="h-px flex-1 bg-[#E5E2D9]" /><span className="text-xs font-medium tracking-wide text-[#1C221E]/70">{t('common.or')}</span><span className="h-px flex-1 bg-[#E5E2D9]" />
            </div>
            <GoogleAuthLink role="seeker" />
            <p className="mt-6 text-center text-sm leading-relaxed text-[#1C221E]">{t('auth.noAccount')} <Link className="font-semibold text-[#2B362E] underline decoration-[#A37E5E] underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]" to="/register">{t('auth.registerLink')}</Link></p>
          </motion.div>
        </section>
        <AuthVisualPanel />
      </div>
    </main>
  );
}
