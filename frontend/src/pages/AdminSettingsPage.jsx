import { useEffect, useState } from 'react';
import { CircleAlert, Eye, EyeOff, Save, Settings2, ShieldCheck, SlidersHorizontal, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import Button from '../components/Button';
import FormField from '../components/FormField';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getApiData } from '../utils/apiResponse';
import { setAdminPreferences, useAdminPreferences } from '../utils/adminPreferences';
import { getValidationErrors } from '../utils/validationErrors';

const inputClass = 'h-10 w-full rounded-lg border border-[#E5E2D9] bg-white px-4 text-sm text-[#1C221E] transition-colors duration-150 focus:border-[#A37E5E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]';
const compactButton = 'inline-flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#2B362E] px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#1F2822] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function PreferenceToggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-[#E5E2D9] bg-white p-4">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[#1C221E]">{label}</span>
        {description && <span className="mt-1 block text-xs leading-7 text-[#1C221E]/70">{description}</span>}
      </span>
      <input className="mt-1 h-4 w-4 accent-[#2B362E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function SettingsCard({ icon: Icon, title, children }) {
  return (
    <section className="rounded-xl border border-[#E5E2D9] bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FAF9F5] text-[#2B362E]"><Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" /></span>
        <h2 className="text-base font-semibold text-[#2B362E] sm:text-lg">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function PasswordField({ name, label, placeholder, value, onChange, error, autoComplete, disabled }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const inputId = `admin-${name.replaceAll('_', '-')}`;

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[#1E2620]" htmlFor={inputId}>{label}</label>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`${inputClass} pe-12 ${error ? 'border-[#B91C1C] focus:border-[#B91C1C]' : ''} disabled:cursor-not-allowed disabled:opacity-50`}
        />
        <button
          type="button"
          className="absolute end-0 top-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-[#4A544D] transition-colors duration-150 hover:text-[#2B362E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          aria-label={t(visible ? 'admin.settings.hidePassword' : 'admin.settings.showPassword', { field: label })}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" /> : <Eye className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />}
        </button>
      </div>
      {error && <p id={`${inputId}-error`} className="mt-1 text-xs text-[#B91C1C]">{error}</p>}
    </div>
  );
}

export default function AdminSettingsPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const { updateCurrentUser } = useAuth();
  const preferences = useAdminPreferences();
  const [account, setAccount] = useState(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountError, setAccountError] = useState(false);
  const [accountValues, setAccountValues] = useState({ name: '', email: '' });
  const [accountErrors, setAccountErrors] = useState({});
  const [accountFeedback, setAccountFeedback] = useState(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [passwordValues, setPasswordValues] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordFeedback, setPasswordFeedback] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [platform, setPlatform] = useState(null);
  const [platformLoading, setPlatformLoading] = useState(true);
  const [platformError, setPlatformError] = useState(false);
  const [platformErrors, setPlatformErrors] = useState({});
  const [savingPlatform, setSavingPlatform] = useState(false);
  const [platformFeedback, setPlatformFeedback] = useState('');
  const [platformAttempt, setPlatformAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/me', { signal: controller.signal })
      .then((response) => {
        const user = getApiData(response).user;
        if (!user) throw new Error('Missing account data');
        setAccount(user);
        setAccountValues({ name: user.name ?? '', email: user.email ?? '' });
      })
      .catch((error) => { if (error.code !== 'ERR_CANCELED') setAccountError(true); })
      .finally(() => { if (!controller.signal.aborted) setAccountLoading(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setPlatformLoading(true);
    setPlatformError(false);
    api.get('/admin/settings', { signal: controller.signal })
      .then((response) => setPlatform(getApiData(response)))
      .catch((error) => { if (error.code !== 'ERR_CANCELED') setPlatformError(true); })
      .finally(() => { if (!controller.signal.aborted) setPlatformLoading(false); });
    return () => controller.abort();
  }, [platformAttempt]);

  const updateAccountField = (field) => (event) => {
    setAccountValues((current) => ({ ...current, [field]: event.target.value }));
    setAccountErrors((current) => ({ ...current, [field]: '' }));
    setAccountFeedback(null);
  };

  const saveAccount = async (event) => {
    event.preventDefault();
    const values = { name: accountValues.name.trim(), email: accountValues.email.trim() };
    const nextErrors = {};
    if (!values.name) nextErrors.name = t('validation.required');
    if (!values.email) nextErrors.email = t('validation.required');
    else if (!/^\S+@\S+\.\S+$/.test(values.email)) nextErrors.email = t('validation.email');
    if (Object.keys(nextErrors).length) {
      setAccountErrors(nextErrors);
      setAccountFeedback({ kind: 'error', message: t('admin.settings.accountReviewFields') });
      return;
    }

    setSavingAccount(true);
    setAccountErrors({});
    setAccountFeedback(null);
    try {
      const response = await api.put('/me/account', values);
      const user = getApiData(response).user;
      setAccount(user);
      setAccountValues({ name: user.name, email: user.email });
      updateCurrentUser(user);
      setAccountFeedback({ kind: 'success', message: t('admin.settings.accountSaved') });
      notify(t('admin.settings.accountSaved'));
    } catch (error) {
      const validation = getValidationErrors(error, {
        messageForField: (_, field) => t(field === 'email' ? 'admin.settings.accountEmailInvalid' : 'admin.settings.accountNameInvalid'),
      });
      if (validation) setAccountErrors(validation);
      setAccountFeedback({ kind: 'error', message: t(validation ? 'admin.settings.accountReviewFields' : 'admin.settings.accountSaveError') });
      if (!validation) notify(t('admin.settings.accountSaveError'), 'error');
    } finally {
      setSavingAccount(false);
    }
  };

  const updatePasswordField = (field) => (event) => {
    setPasswordValues((current) => ({ ...current, [field]: event.target.value }));
    setPasswordErrors((current) => ({ ...current, [field]: '' }));
    setPasswordFeedback(null);
  };

  const savePassword = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!passwordValues.current_password) nextErrors.current_password = t('validation.required');
    if (!passwordValues.password) nextErrors.password = t('validation.required');
    else if (passwordValues.password.length < 8) nextErrors.password = t('validation.passwordLength');
    if (!passwordValues.password_confirmation) nextErrors.password_confirmation = t('validation.required');
    else if (passwordValues.password !== passwordValues.password_confirmation) nextErrors.password_confirmation = t('validation.passwordConfirmation');
    if (Object.keys(nextErrors).length) {
      setPasswordErrors(nextErrors);
      setPasswordFeedback({ kind: 'error', message: t('admin.settings.passwordReviewFields') });
      return;
    }

    setSavingPassword(true);
    setPasswordErrors({});
    setPasswordFeedback(null);
    try {
      await api.put('/me/password', passwordValues);
      setPasswordValues({ current_password: '', password: '', password_confirmation: '' });
      setPasswordFeedback({ kind: 'success', message: t('admin.settings.passwordSaved') });
      notify(t('admin.settings.passwordSaved'));
    } catch (error) {
      const validation = getValidationErrors(error, {
        messageForField: (messages, field) => {
          if (field === 'current_password') return t(messages?.[0]?.includes('incorrect') ? 'admin.settings.currentPasswordIncorrect' : 'admin.settings.currentPasswordRequired');
          if (field === 'password') return t('admin.settings.newPasswordInvalid');
          return t('validation.passwordConfirmation');
        },
      });
      if (validation) setPasswordErrors(validation);
      setPasswordFeedback({ kind: 'error', message: t(validation ? 'admin.settings.passwordReviewFields' : 'admin.settings.passwordSaveError') });
      if (!validation) notify(t('admin.settings.passwordSaveError'), 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const updatePlatform = (field, value) => {
    setPlatform((current) => ({ ...current, [field]: value }));
    setPlatformErrors((current) => ({ ...current, [field]: '' }));
    setPlatformFeedback('');
  };

  const savePlatformPreferences = async (event) => {
    event.preventDefault();
    setSavingPlatform(true);
    setPlatformErrors({});
    try {
      const response = await api.put('/admin/settings', {
        support_email: platform.support_email.trim(),
        default_seeker_ai_uses: Number(platform.default_seeker_ai_uses),
        default_company_ai_uses: Number(platform.default_company_ai_uses),
        company_verification_mode: platform.company_verification_mode,
        maintenance_enabled: Boolean(platform.maintenance_enabled),
        maintenance_message_ar: platform.maintenance_message_ar || null,
        maintenance_message_en: platform.maintenance_message_en || null,
      });
      setPlatform(getApiData(response));
      setPlatformFeedback(t('admin.settings.saved'));
      notify(t('admin.settings.saved'));
      window.dispatchEvent(new Event('careerhub:platform-config-updated'));
    } catch (error) {
      const validation = getValidationErrors(error);
      if (validation) setPlatformErrors(validation);
      else notify(t('admin.settings.platformSaveError'), 'error');
    } finally { setSavingPlatform(false); }
  };

  return (
    <section className="space-y-6" aria-labelledby="admin-settings-title">
      <header>
        <p className="mb-2 text-xs font-semibold tracking-wide text-[#A37E5E]">{t('admin.settings.eyebrow')}</p>
        <h1 id="admin-settings-title" className="text-xl font-semibold text-[#1C221E] sm:text-2xl">{t('admin.settings.title')}</h1>
        <p className="mt-2 max-w-prose text-sm leading-7 text-[#4A544D]">{t('admin.settings.subtitle')}</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsCard icon={SlidersHorizontal} title={t('admin.settings.interfaceTitle')}>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E5E2D9] bg-white p-4">
              <div><p className="text-sm font-medium text-[#1C221E]">{t('admin.settings.language')}</p><p className="mt-1 text-xs leading-7 text-[#1C221E]/70">{t('admin.settings.languageDescription')}</p></div>
              <LanguageSwitcher />
            </div>
            <label className="block text-sm font-medium text-[#1C221E]" htmlFor="admin-density">{t('admin.settings.tableDensity')}
              <select id="admin-density" className={`${inputClass} mt-1`} value={preferences.tableDensity} onChange={(event) => setAdminPreferences({ tableDensity: event.target.value })}>
                <option value="comfortable">{t('admin.settings.comfortable')}</option>
                <option value="compact">{t('admin.settings.compact')}</option>
              </select>
            </label>
            <PreferenceToggle checked={preferences.showPendingVerificationBadge} onChange={(value) => setAdminPreferences({ showPendingVerificationBadge: value })} label={t('admin.settings.pendingBadge')} description={t('admin.settings.pendingBadgeDescription')} />
          </div>
        </SettingsCard>

        <SettingsCard icon={UserRound} title={t('admin.settings.accountTitle')}>
          {accountLoading ? (
            <div className="animate-pulse space-y-3" aria-hidden="true"><div className="h-4 w-1/3 rounded-lg bg-[#E5E2D9]/60" /><div className="h-10 rounded-lg bg-[#E5E2D9]/60" /><div className="h-10 rounded-lg bg-[#E5E2D9]/60" /></div>
          ) : accountError ? (
            <div className="flex items-start gap-3 rounded-lg border border-[#E5E2D9] bg-[#FAF9F5] p-4" role="alert"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" /><p className="text-sm leading-7 text-[#1C221E]">{t('admin.settings.profileLoadError')}</p></div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 rounded-lg border border-[#E5E2D9] bg-[#FAF9F5] p-3 text-sm font-medium text-[#2B362E]">
                <ShieldCheck className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                <span dir="auto">{account?.name || t('admin.settings.unknownAdmin')}</span>
                <span className="ms-auto rounded-full border border-[#E5E2D9] bg-white px-2 py-1 text-xs">{t('admin.shell.roleBadge')}</span>
              </div>
              <form className="space-y-3.5" onSubmit={saveAccount} noValidate>
                <h3 className="text-sm font-semibold text-[#1E2620]">{t('admin.settings.accountInfoTitle')}</h3>
                <FormField label={t('admin.settings.accountName')} name="name" type="text" autoComplete="name" maxLength={255} placeholder={t('admin.settings.accountNamePlaceholder')} value={accountValues.name} onChange={updateAccountField('name')} error={accountErrors.name} disabled={savingAccount} required />
                <FormField label={t('admin.settings.accountEmail')} name="email" type="email" autoComplete="email" maxLength={255} placeholder={t('admin.settings.accountEmailPlaceholder')} value={accountValues.email} onChange={updateAccountField('email')} error={accountErrors.email} disabled={savingAccount} required />
                {accountFeedback && <p className={`rounded-lg border p-3 text-sm ${accountFeedback.kind === 'success' ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]' : 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'}`} role={accountFeedback.kind === 'error' ? 'alert' : 'status'}>{accountFeedback.message}</p>}
                <Button type="submit" loading={savingAccount} className="h-10 px-4 text-sm">{t('common.save')}</Button>
              </form>
              <div className="border-t border-[#E5E2D9] pt-6">
                <form className="space-y-3.5" onSubmit={savePassword} noValidate>
                  <h3 className="text-sm font-semibold text-[#1E2620]">{t('admin.settings.passwordTitle')}</h3>
                  <PasswordField name="current_password" label={t('admin.settings.currentPassword')} placeholder={t('admin.settings.currentPasswordPlaceholder')} value={passwordValues.current_password} onChange={updatePasswordField('current_password')} error={passwordErrors.current_password} autoComplete="current-password" disabled={savingPassword} />
                  <PasswordField name="password" label={t('admin.settings.newPassword')} placeholder={t('admin.settings.newPasswordPlaceholder')} value={passwordValues.password} onChange={updatePasswordField('password')} error={passwordErrors.password} autoComplete="new-password" disabled={savingPassword} />
                  <PasswordField name="password_confirmation" label={t('admin.settings.confirmNewPassword')} placeholder={t('admin.settings.confirmNewPasswordPlaceholder')} value={passwordValues.password_confirmation} onChange={updatePasswordField('password_confirmation')} error={passwordErrors.password_confirmation} autoComplete="new-password" disabled={savingPassword} />
                  {passwordFeedback && <p className={`rounded-lg border p-3 text-sm ${passwordFeedback.kind === 'success' ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]' : 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'}`} role={passwordFeedback.kind === 'error' ? 'alert' : 'status'}>{passwordFeedback.message}</p>}
                  <Button type="submit" loading={savingPassword} className="h-10 px-4 text-sm">{t('admin.settings.changePassword')}</Button>
                </form>
              </div>
            </div>
          )}
        </SettingsCard>

        <SettingsCard icon={Settings2} title={t('admin.settings.platformTitle')}>
          {platformLoading ? <div className="animate-pulse space-y-4" role="status" aria-label={t('common.loading')}><div className="h-10 rounded-lg bg-[#E5E2D9]/60" /><div className="h-10 rounded-lg bg-[#E5E2D9]/60" /><div className="h-10 rounded-lg bg-[#E5E2D9]/60" /></div> : platformError ? <div role="alert" className="space-y-3"><p>{t('admin.settings.platformLoadError')}</p><Button onClick={() => setPlatformAttempt((value) => value + 1)}>{t('admin.overview.retry')}</Button></div> : <form className="space-y-4" onSubmit={savePlatformPreferences} noValidate>
            <FormField label={t('admin.settings.supportEmail')} name="support_email" type="email" value={platform.support_email || ''} onChange={(event) => updatePlatform('support_email', event.target.value)} error={platformErrors.support_email} />
            {['default_seeker_ai_uses', 'default_company_ai_uses'].map((field) => <FormField key={field} label={t(`admin.settings.${field}`)} name={field} type="number" min="0" max="1000" value={platform[field]} onChange={(event) => updatePlatform(field, event.target.value)} error={platformErrors[field]} />)}
            <label className="block text-sm font-medium text-[#1C221E]" htmlFor="admin-verification-mode">{t('admin.settings.verificationMode')}
              <select id="admin-verification-mode" className={`${inputClass} mt-1`} value={platform.company_verification_mode} onChange={(event) => updatePlatform('company_verification_mode', event.target.value)}>
                <option value="manual">{t('admin.settings.manual')}</option>
                <option value="automatic">{t('admin.settings.automatic')}</option>
              </select>
              {platformErrors.company_verification_mode && <span className="mt-1 block text-xs text-[#B91C1C]">{platformErrors.company_verification_mode}</span>}
            </label>
            <PreferenceToggle checked={Boolean(platform.maintenance_enabled)} onChange={(value) => updatePlatform('maintenance_enabled', value)} label={t('admin.settings.maintenanceEnabled')} description={t('admin.settings.maintenanceDescription')} />
            {['en', 'ar'].map((language) => <label key={language} className="block text-sm font-medium text-[#1C221E]" htmlFor={`maintenance-${language}`}>{t(`admin.settings.maintenanceMessage${language.toUpperCase()}`)}<textarea id={`maintenance-${language}`} className={`${inputClass} mt-1 h-24 py-2`} value={platform[`maintenance_message_${language}`] || ''} onChange={(event) => updatePlatform(`maintenance_message_${language}`, event.target.value)} />{platformErrors[`maintenance_message_${language}`] && <span className="mt-1 block text-xs text-[#B91C1C]">{platformErrors[`maintenance_message_${language}`]}</span>}</label>)}
            {platformFeedback && <p role="status" className="text-sm text-[#15803D]">{platformFeedback}</p>}
            <button className={compactButton} type="submit" disabled={savingPlatform}><Save className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{savingPlatform ? t('common.loading') : t('common.save')}</button>
          </form>}
        </SettingsCard>
      </div>
    </section>
  );
}
