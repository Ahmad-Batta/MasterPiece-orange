import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { ArrowUpRight, BriefcaseBusiness, Check, Circle, Sparkles, UserRoundCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import api from '../api/axios';
import Button from '../components/Button';
import IconBadge from '../components/IconBadge';
import JobCard from '../components/JobCard';
import JobCardSkeleton from '../components/JobCardSkeleton';
import PaginationBar from '../components/PaginationBar';
import SeekerOnboardingModal from '../components/SeekerOnboardingModal';
import { getApiData, getApiItems } from '../utils/apiResponse';
import { hasActivePro, openBilling, profileChecklist, profileCompleteness } from '../utils/seekerProfile';

export default function SeekerOverviewPage() {
  const { t, i18n } = useTranslation();
  const { profile, profileLoading, profileError, reloadProfile, setResumeDraft } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [dismissedFor, setDismissedFor] = useState(null);
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [recommendations, setRecommendations] = useState(null);
  const [recommendationError, setRecommendationError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setRecommendationError(false);
    api.get('/seeker/recommendations', { params: { page }, signal: controller.signal })
      .then((response) => { if (!controller.signal.aborted) setRecommendations(getApiData(response)); })
      .catch(() => { if (!controller.signal.aborted) setRecommendationError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, attempt]);

  const score = profile ? profileCompleteness(profile) : 0;
  const onboardingKey = profile && `careerhub:seeker-onboarding:${profile.id}`;
  let seen = dismissedFor === onboardingKey;
  try { if (onboardingKey && localStorage.getItem(onboardingKey)) seen = true; } catch { /* Storage may be unavailable. */ }
  const showOnboarding = Boolean(onboardingKey && !seen && (location.state?.newSeeker || (score < 60 && !profile.has_cv)));
  const formatNumber = (number) => new Intl.NumberFormat(i18n.language).format(number);
  const matches = getApiItems(recommendations).filter((match) => match.job?.id != null);

  function dismissOnboarding() {
    setDismissedFor(onboardingKey);
    try { localStorage.setItem(onboardingKey, 'seen'); } catch { /* Dismiss for this visit. */ }
  }

  function chooseOnboarding(mode, file) {
    dismissOnboarding();
    setResumeDraft(file);
    navigate(`/seeker/cv-builder?mode=${mode}`);
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="section-title">{t('seeker.navigation.overview')}</h1>
        {profile?.name && <p className="mt-2 text-sm leading-relaxed text-[#1C221E]/75">{t('seeker.overview.welcome', { name: profile.name })}</p>}
      </header>
      {profileLoading && !profile ? (
        <div className="grid gap-6 lg:grid-cols-3" aria-busy="true" aria-label={t('common.loading')}>
          <div className="surface-card h-56 animate-pulse bg-[#E5E2D9]/60 lg:col-span-2" />
          <div className="surface-card h-56 animate-pulse bg-[#E5E2D9]/60" />
        </div>
      ) : profileError ? (
        <div className="surface-card space-y-4"><p role="alert">{t('seeker.profile.loadError')}</p><Button onClick={() => reloadProfile()}>{t('seeker.retry')}</Button></div>
      ) : profile && (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="surface-card flex flex-col justify-between lg:col-span-2">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <IconBadge icon={UserRoundCheck} />
                  <h2 className="text-base font-semibold text-[#2B362E] sm:text-lg">{t('seeker.overview.strength')}</h2>
                </div>
                <span className="text-2xl font-semibold tabular-nums text-[#2B362E]">{new Intl.NumberFormat(i18n.language, { style: 'percent' }).format(score / 100)}</span>
              </div>
              <div role="progressbar" aria-label={t('seeker.overview.strength')} aria-valuenow={score}
                className="mt-4 h-2 overflow-hidden rounded-full bg-[#E5E2D9]">
                <div style={{ width: `${score}%` }} className="h-full rounded-full bg-[#2B362E]" />
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
                {profileChecklist(profile).map(({ key, complete }) => {
                  const Icon = complete ? Check : Circle;
                  return <li key={key} className="flex items-center gap-2 text-xs text-[#1C221E]/80">
                    <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    <span className="sr-only">{t(complete ? 'seeker.overview.complete' : 'seeker.overview.missing')}</span>
                    {t(`seeker.overview.checklist.${key}`)}
                  </li>;
                })}
              </ul>
            </div>
            <Link className="button-secondary mt-6 self-start" to="/seeker/profile">{t('seeker.overview.edit')}<ArrowUpRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.75} aria-hidden="true" /></Link>
          </section>
          <section className="surface-card flex flex-col justify-between">
            <div>
              <IconBadge icon={Sparkles} tone="bronze" />
              <h2 className="mt-4 text-base font-semibold text-[#2B362E]">{t('seeker.overview.quota')}</h2>
              <p className="mt-2 inline-flex rounded-full border border-[#E5E2D9] bg-[#FAF9F5] px-3 py-1 text-sm tabular-nums text-[#2B362E]">
                {hasActivePro(profile) ? t('seeker.overview.unlimited') : t('seeker.overview.remaining', { remaining: formatNumber(profile.free_ai_uses_remaining ?? 0) })}
              </p>
            </div>
            <div className="mt-6"><Button variant="secondary" onClick={openBilling}>{t('billing.title')}</Button></div>
          </section>
        </div>
      )}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <IconBadge icon={BriefcaseBusiness} />
          <h2 className="section-title">{t('seeker.overview.recommendations')}</h2>
        </div>
        {loading ? <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label={t('common.loading')}>
          <JobCardSkeleton /><JobCardSkeleton /><JobCardSkeleton />
        </div> : recommendationError ? <div className="surface-card space-y-4"><p role="alert">{t('seeker.overview.recommendationsError')}</p><Button onClick={() => setAttempt((value) => value + 1)}>{t('seeker.retry')}</Button></div>
          : matches.length ? <>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {matches.map(({ job, match_percentage }) => <JobCard key={job.id} job={job} matchPercentage={match_percentage} />)}
            </div>
            <PaginationBar page={page} lastPage={recommendations?.pagination?.last_page ?? 1} onChange={setPage}
              labels={{
                page: (current, total) => t('seeker.pagination.page', { current, total }),
                previous: t('seeker.pagination.previous'), previousPage: t('seeker.pagination.previous'),
                next: t('seeker.pagination.next'), nextPage: t('seeker.pagination.next'),
              }} />
          </> : <div className="surface-card flex flex-col items-center gap-4 text-center">
            <IconBadge icon={Sparkles} tone="bronze" large />
            <p className="text-sm leading-relaxed">{t('seeker.overview.noRecommendations')}</p>
            <Link className="button-primary" to="/seeker/profile">{t('seeker.overview.edit')}</Link>
          </div>}
      </section>
      <AnimatePresence>{showOnboarding && <SeekerOnboardingModal onChoose={chooseOnboarding} onSkip={dismissOnboarding} />}</AnimatePresence>
    </div>
  );
}
