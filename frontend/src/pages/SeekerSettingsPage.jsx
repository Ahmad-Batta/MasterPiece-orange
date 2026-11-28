import { useEffect, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import Button from '../components/Button';
import FormField from '../components/FormField';
import IconBadge from '../components/IconBadge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getApiData } from '../utils/apiResponse';
import { getValidationErrors } from '../utils/validationErrors';

function PasswordField({ label, name, value, onChange, error, disabled, autoComplete, t }) {
  const [visible, setVisible] = useState(false);
  return <div className="relative"><FormField label={label} name={name} type={visible ? 'text' : 'password'} value={value} onChange={onChange} error={error} disabled={disabled} autoComplete={autoComplete} inputClassName="pe-12" required /><button type="button" className="absolute end-0 top-8 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-[#2B362E] transition-colors duration-150 hover:bg-[#FAF9F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] disabled:cursor-not-allowed disabled:opacity-50" aria-label={t(visible ? 'seeker.settings.hidePassword' : 'seeker.settings.showPassword')} onClick={() => setVisible((current) => !current)} disabled={disabled}>{visible ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}</button></div>;
}

export default function SeekerSettingsPage({ role = 'seeker' }) {
  const { t } = useTranslation();
  const { user, updateCurrentUser } = useAuth();
  const { notify } = useToast();
  const [account, setAccount] = useState({ name: '', email: '' });
  const [password, setPassword] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [accountErrors, setAccountErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [accountFeedback, setAccountFeedback] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setLoadError(false);
    api.get('/me', { signal: controller.signal }).then((response) => { const saved = getApiData(response).user; setAccount({ name: saved?.name || '', email: saved?.email || '' }); }).catch((reason) => { if (reason.code !== 'ERR_CANCELED') setLoadError(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  const saveAccount = async (event) => {
    event.preventDefault(); setAccountFeedback('');
    const values = { name: account.name.trim(), email: account.email.trim() };
    const errors = {};
    if (!values.name) errors.name = t('validation.required');
    if (!/^\S+@\S+\.\S+$/.test(values.email)) errors.email = t('validation.email');
    if (Object.keys(errors).length) { setAccountErrors(errors); return; }
    setSavingAccount(true); setAccountErrors({});
    try { const saved = getApiData(await api.put('/me/account', values)).user; setAccount({ name: saved.name, email: saved.email }); updateCurrentUser({ ...user, ...saved }); setAccountFeedback(t('seeker.settings.accountSaved')); notify(t('seeker.settings.accountSaved')); }
    catch (reason) { setAccountErrors(getValidationErrors(reason, { messageForField: () => t('seeker.settings.checkField') }) || {}); notify(t('seeker.settings.accountError'), 'error'); }
    finally { setSavingAccount(false); }
  };

  const savePassword = async (event) => {
    event.preventDefault(); setPasswordFeedback('');
    const errors = {};
    if (!password.current_password) errors.current_password = t('validation.required');
    if (password.password.length < 8) errors.password = t('validation.passwordLength');
    if (password.password !== password.password_confirmation) errors.password_confirmation = t('validation.passwordConfirmation');
    if (Object.keys(errors).length) { setPasswordErrors(errors); return; }
    setSavingPassword(true); setPasswordErrors({});
    try { await api.put('/me/password', password); setPassword({ current_password: '', password: '', password_confirmation: '' }); setPasswordFeedback(t('seeker.settings.passwordSaved')); notify(t('seeker.settings.passwordSaved')); }
    catch (reason) { setPasswordErrors(getValidationErrors(reason, { messageForField: (messages, field) => field === 'current_password' && messages?.[0]?.includes('incorrect') ? t('seeker.settings.currentPasswordIncorrect') : t('seeker.settings.checkField') }) || {}); notify(t('seeker.settings.passwordError'), 'error'); }
    finally { setSavingPassword(false); }
  };

  return <section className="space-y-8"><header className="flex items-center gap-4"><IconBadge icon={UserRound} large /><div><h1 className="section-title">{t(role === 'company' ? 'companySettings.title' : 'seeker.navigation.settings')}</h1><p className="mt-1 text-sm text-[#1C221E]/70">{t(role === 'company' ? 'companySettings.intro' : 'seeker.settings.intro')}</p></div></header>
    {loading ? <div className="grid gap-6 md:grid-cols-2" role="status" aria-label={t('common.loading')}>{[0, 1].map((item) => <div key={item} className="surface-card animate-pulse"><div className="h-12 w-12 rounded-2xl bg-[#E5E2D9]/60" /><div className="mt-6 h-10 rounded-lg bg-[#E5E2D9]/60" /><div className="mt-4 h-10 rounded-lg bg-[#E5E2D9]/60" /></div>)}</div> : loadError ? <div className="surface-card text-center" role="alert"><p>{t('seeker.settings.loadError')}</p><Button className="mt-4" onClick={() => setAttempt((value) => value + 1)}>{t('seeker.retry')}</Button></div> : <div className="grid items-start gap-6 lg:grid-cols-2">
      <form className="surface-card space-y-4" onSubmit={saveAccount} noValidate><IconBadge icon={UserRound} /><h2 className="text-lg font-semibold text-[#2B362E]">{t('seeker.settings.accountTitle')}</h2><FormField label={t('seeker.settings.name')} name="name" autoComplete="name" maxLength={255} value={account.name} onChange={(event) => { setAccount({ ...account, name: event.target.value }); setAccountErrors({ ...accountErrors, name: '' }); }} error={accountErrors.name} disabled={savingAccount} required /><FormField label={t('seeker.settings.email')} name="email" type="email" autoComplete="email" maxLength={255} value={account.email} onChange={(event) => { setAccount({ ...account, email: event.target.value }); setAccountErrors({ ...accountErrors, email: '' }); }} error={accountErrors.email} disabled={savingAccount} required />{accountFeedback && <p role="status" className="text-sm text-[#15803D]">{accountFeedback}</p>}<Button type="submit" loading={savingAccount}>{t('common.save')}</Button></form>
      <form className="surface-card space-y-4" onSubmit={savePassword} noValidate><IconBadge icon={LockKeyhole} tone="bronze" /><h2 className="text-lg font-semibold text-[#2B362E]">{t('seeker.settings.passwordTitle')}</h2>{[['current_password', 'current-password'], ['password', 'new-password'], ['password_confirmation', 'new-password']].map(([field, autoComplete]) => <PasswordField key={field} name={field} label={t(`seeker.settings.${field}`)} value={password[field]} onChange={(event) => { setPassword({ ...password, [field]: event.target.value }); setPasswordErrors({ ...passwordErrors, [field]: '' }); }} error={passwordErrors[field]} disabled={savingPassword} autoComplete={autoComplete} t={t} />)}{passwordFeedback && <p role="status" className="text-sm text-[#15803D]">{passwordFeedback}</p>}<Button type="submit" loading={savingPassword}>{t('seeker.settings.changePassword')}</Button></form>
    </div>}
  </section>;
}
