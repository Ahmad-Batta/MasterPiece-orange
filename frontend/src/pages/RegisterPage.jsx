import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Building2, UserRound } from 'lucide-react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '../components/Button';
import FormField from '../components/FormField';
import GoogleAuthLink from '../components/GoogleAuthLink';
import AuthVisualPanel from '../components/AuthVisualPanel';
import { dashboardPath, useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

function validRole(role) {
  return role === 'company' ? 'company' : 'seeker';
}

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register, session, isLoading } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [role, setRole] = useState(validRole(searchParams.get('role')));
  const [values, setValues] = useState({ name: '', email: '', password: '', password_confirmation: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = t('auth.registerTitle');
  }, [t]);

  useEffect(() => {
    setRole(validRole(searchParams.get('role')));
  }, [searchParams]);

  if (!isLoading && session) return <Navigate to={dashboardPath(session.role)} replace />;

  const selectRole = (nextRole) => {
    setRole(nextRole);
    setSearchParams({ role: nextRole }, { replace: true });
  };

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setMessage('');
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (values.name.trim().length < 2) nextErrors.name = t('validation.nameLength');
    if (!/^\S+@\S+\.\S+$/.test(values.email)) nextErrors.email = values.email ? t('validation.email') : t('validation.required');
    if (values.password.length < 8) nextErrors.password = t('validation.passwordLength');
    if (!values.password_confirmation) nextErrors.password_confirmation = t('validation.required');
    else if (values.password !== values.password_confirmation) nextErrors.password_confirmation = t('validation.passwordConfirmation');
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setMessage(t('auth.reviewFields'));
      return;
    }

    setSubmitting(true);
    setErrors({});
    setMessage('');
    try {
      const nextSession = await register({ ...values, name: values.name.trim(), role });
      notify(t('auth.registerSuccess'));
      navigate(dashboardPath(nextSession.role), { replace: true });
    } catch (error) {
      if (error.response?.status === 422) {
        const fields = error.response.data?.errors || {};
        setErrors(Object.fromEntries(Object.keys(fields).map((field) => [field, t('auth.reviewFields')])));
        setMessage(t('auth.reviewFields'));
      } else {
        setMessage(t('auth.requestFailed'));
      }
      notify(t('auth.requestFailed'), 'error');
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
              <h1 className="font-display text-3xl font-semibold tracking-tight text-[#2B362E] sm:text-4xl">{t('auth.registerTitle')}</h1>
              <p className="mx-auto mt-3 max-w-prose text-sm leading-relaxed text-[#1C221E] sm:text-base">{t('auth.registerBody')}</p>
            </div>

            <fieldset className="mb-6">
              <legend className="mb-3 text-sm font-semibold text-[#2B362E]">{t('auth.rolePrompt')}</legend>
              <div className="grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label={t('auth.rolePrompt')}>
                <motion.button type="button" role="radio" aria-checked={role === 'seeker'} className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-4 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 ${role === 'seeker' ? 'border-[#2B362E] bg-[#2B362E] text-white' : 'border-[#E5E2D9] bg-white text-[#2B362E] hover:bg-[#FAF9F5]'}`} onClick={() => selectRole('seeker')} whileTap={{ scale: 0.98 }}>
                  <UserRound className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('auth.seekerRole')}
                </motion.button>
                <motion.button type="button" role="radio" aria-checked={role === 'company'} className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-4 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 ${role === 'company' ? 'border-[#2B362E] bg-[#2B362E] text-white' : 'border-[#E5E2D9] bg-white text-[#2B362E] hover:bg-[#FAF9F5]'}`} onClick={() => selectRole('company')} whileTap={{ scale: 0.98 }}>
                  <Building2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('auth.companyRole')}
                </motion.button>
              </div>
            </fieldset>

            <form className="flex flex-col space-y-3.5" onSubmit={submit} noValidate>
              <FormField label={t('auth.name')} name="name" type="text" autoComplete="name" placeholder={t('auth.namePlaceholder')} value={values.name} onChange={update('name')} error={errors.name} required />
              <FormField label={t('auth.email')} name="email" type="email" autoComplete="email" placeholder={t('auth.emailPlaceholder')} value={values.email} onChange={update('email')} error={errors.email} required />
              <FormField label={t('auth.password')} name="password" type="password" autoComplete="new-password" placeholder={t('auth.passwordPlaceholder')} value={values.password} onChange={update('password')} error={errors.password} required />
              <FormField label={t('auth.confirmPassword')} name="password_confirmation" type="password" autoComplete="new-password" placeholder={t('auth.confirmPasswordPlaceholder')} value={values.password_confirmation} onChange={update('password_confirmation')} error={errors.password_confirmation} required />
              <AnimatePresence initial={false}>{message && <motion.p key="register-alert" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="rounded-lg border border-[#E5E2D9] bg-[#FAF9F5] p-4 text-sm leading-relaxed text-[#1C221E]" role="alert">{message}</motion.p>}</AnimatePresence>
              <Button type="submit" loading={submitting} className="w-full">{t('auth.registerSubmit')}<ArrowUpRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.75} aria-hidden="true" /></Button>
            </form>
            <div className="my-6 flex items-center gap-4" aria-hidden="true">
              <span className="h-px flex-1 bg-[#E5E2D9]" /><span className="text-xs font-medium tracking-wide text-[#1C221E]/70">{t('common.or')}</span><span className="h-px flex-1 bg-[#E5E2D9]" />
            </div>
            <GoogleAuthLink role={role} />
            <p className="mt-6 text-center text-sm leading-relaxed text-[#1C221E]">{t('auth.hasAccount')} <Link className="font-semibold text-[#2B362E] underline decoration-[#A37E5E] underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]" to="/login">{t('auth.loginLink')}</Link></p>
          </motion.div>
        </section>
        <AuthVisualPanel />
      </div>
    </main>
  );
}
