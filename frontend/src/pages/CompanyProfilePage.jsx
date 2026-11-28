import { useEffect, useState } from 'react';
import { Building2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import Button from '../components/Button';
import IconBadge from '../components/IconBadge';
import { useToast } from '../context/ToastContext';
import { getApiData } from '../utils/apiResponse';

export default function CompanyProfilePage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError(false); api.get('/company/profile', { signal: controller.signal }).then((response) => setProfile(getApiData(response))).catch((reason) => { if (reason.code !== 'ERR_CANCELED') setError(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [retry]);
  const requestVerification = async () => { setBusy(true); try { const response = await api.post('/company/verify-request'); setProfile(getApiData(response)); notify(t('companyWorkspace.verificationRequested')); } catch { notify(t('companyWorkspace.actionError'), 'error'); } finally { setBusy(false); } };
  return <main id="main-content" className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8"><header className="flex items-center gap-4"><IconBadge icon={Building2} large /><div><h1 className="section-title">{t('companyWorkspace.profileTitle')}</h1><p className="mt-1 text-sm text-[#1C221E]/70">{t('companyWorkspace.profileIntro')}</p></div></header>{loading ? <div className="surface-card animate-pulse" role="status" aria-label={t('common.loading')}><div className="h-12 w-12 rounded-2xl bg-[#E5E2D9]/60" /><div className="mt-4 h-6 w-1/2 rounded-lg bg-[#E5E2D9]/60" /></div> : error ? <div className="surface-card" role="alert"><p>{t('companyWorkspace.loadError')}</p><Button className="mt-4" onClick={() => setRetry((value) => value + 1)}>{t('seeker.retry')}</Button></div> : <div className="surface-card space-y-4"><IconBadge icon={ShieldCheck} tone="bronze" /><h2 className="text-lg font-semibold text-[#2B362E]" dir="auto">{profile.company_name}</h2><p className="text-sm text-[#1C221E]/75" dir="auto">{profile.industry} · {profile.location}</p><p className="text-sm text-[#1C221E]/75">{t('companyWorkspace.verificationStatus', { status: t(`companyWorkspace.status.${profile.verification_status}`) })}</p><div className="flex flex-wrap gap-3">{profile.verification_status === 'unverified' && <Button loading={busy} onClick={requestVerification}>{t('companyWorkspace.requestVerification')}</Button>}<Link className="button-secondary" to="/company/jobs">{t('companyWorkspace.jobsTitle')}</Link></div></div>}</main>;
}
