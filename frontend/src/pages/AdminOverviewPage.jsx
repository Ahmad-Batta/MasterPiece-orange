import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, BriefcaseBusiness, Building2, ChartNoAxesCombined, CircleDollarSign, FileText, RefreshCw, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';

function payloadOf(response) {
  return response?.data?.data ?? {};
}

function listFrom(payload, keys = ['items', 'companies', 'data']) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function paginationTotal(payload) {
  const total = payload?.pagination?.total;
  return Number.isFinite(Number(total)) ? Number(total) : null;
}

function ActivitySkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="flex gap-3 border-b border-[#E5E2DC] pb-4 last:border-0">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-[#E5E2DC]/60" />
          <div className="min-w-0 flex-1 space-y-2 py-1">
            <div className="h-3 w-2/3 rounded-lg bg-[#E5E2DC]/60" />
            <div className="h-3 w-full rounded-lg bg-[#E5E2DC]/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="rounded-xl border border-[#E5E2DC] bg-white p-5" aria-hidden="true">
      <div className="animate-pulse space-y-4">
        <div className="h-9 w-9 rounded-lg bg-[#E5E2DC]/60" />
        <div className="h-7 w-24 rounded-lg bg-[#E5E2DC]/60" />
        <div className="h-3 w-32 rounded-lg bg-[#E5E2DC]/60" />
      </div>
    </div>
  );
}

function formatCount(value, language) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat(language === 'ar' ? 'ar-JO' : 'en-US').format(Number(value));
}

function formatActivityDate(value, language) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-JO' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

const activityIcons = {
  application: FileText,
  seeker_registered: Users,
  company_registered: Building2,
  job_post_published: BriefcaseBusiness,
};

export default function AdminOverviewPage() {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState(null);
  const [pendingVerifications, setPendingVerifications] = useState(null);
  const [paidTransactions, setPaidTransactions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadOverview = useCallback(async (signal) => {
    setIsLoading(true);
    setHasError(false);
    const results = await Promise.allSettled([
      api.get('/admin/stats', { signal }),
      api.get('/admin/verifications', { signal }),
      api.get('/admin/payments', { params: { status: 'paid', per_page: 1 }, signal }),
    ]);

    if (signal?.aborted) return;

    if (results[0].status === 'fulfilled') {
      setStats(payloadOf(results[0].value));
    } else {
      setStats(null);
      setHasError(true);
    }

    if (results[1].status === 'fulfilled') {
      setPendingVerifications(listFrom(payloadOf(results[1].value), ['items', 'companies', 'data']).length);
    } else {
      setPendingVerifications(null);
    }

    if (results[2].status === 'fulfilled') {
      setPaidTransactions(paginationTotal(payloadOf(results[2].value)));
    } else {
      setPaidTransactions(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadOverview(controller.signal);
    return () => controller.abort();
  }, [loadOverview]);

  const activities = useMemo(() => Array.isArray(stats?.recent_activities) ? stats.recent_activities.slice(0, 10) : [], [stats]);
  const number = (value) => formatCount(value, i18n.language);

  const metrics = [
    { key: 'seekers', value: stats?.total_seekers, Icon: Users },
    { key: 'companies', value: stats?.total_companies, Icon: Building2, detailKey: 'pendingVerifications', detailValue: pendingVerifications },
    { key: 'activeJobs', value: stats?.active_job_posts, Icon: BriefcaseBusiness },
    { key: 'applications', value: stats?.total_applications, Icon: FileText, detailKey: 'paidProTransactions', detailValue: paidTransactions },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-[#A37E5E]">{t('admin.overview.eyebrow')}</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#2B362E] sm:text-3xl">{t('admin.overview.title')}</h1>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-[#1C221E]">{t('admin.overview.subtitle')}</p>
        </div>
        <button className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 self-start whitespace-nowrap rounded-lg border border-[#E5E2DC] bg-white px-3 text-xs font-medium text-[#2B362E] transition-colors duration-150 hover:bg-[#FAF9F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto" type="button" onClick={() => loadOverview()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} strokeWidth={1.75} aria-hidden="true" />{t('admin.overview.refresh')}
        </button>
      </section>

      {hasError && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-[#E5E2DC] bg-white p-5 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p className="text-sm text-[#1C221E]">{t('admin.overview.loadError')}</p>
          <button className="button-primary h-10 px-4 text-xs" type="button" onClick={() => loadOverview()}>{t('admin.overview.retry')}</button>
        </div>
      )}

      <section aria-label={t('admin.overview.metricsLabel')}>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading ? [0, 1, 2, 3].map((item) => <StatSkeleton key={item} />) : metrics.map(({ key, value, Icon, detailKey, detailValue }, index) => (
            <motion.article
              key={key}
              className="rounded-xl border border-[#E5E2DC] bg-white p-5 shadow-sm"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: index * 0.04 }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FAF9F5] text-[#A37E5E]">
                <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <p className="mt-4 tabular-nums text-2xl font-semibold tracking-tight text-[#2B362E]">{number(value)}</p>
              <h2 className="mt-1 text-xs font-medium text-[#1C221E]/75">{t(`admin.metrics.${key}`)}</h2>
              {detailKey && <p className="mt-3 border-t border-[#E5E2DC] pt-3 text-[10px] text-[#1C221E]/70">{t(`admin.metrics.${detailKey}`)}: <span className="tabular-nums font-semibold text-[#2B362E]">{number(detailValue)}</span></p>}
            </motion.article>
          ))}
        </div>
      </section>

      {!isLoading && stats && (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(16rem,0.85fr)]">
          <article className="rounded-xl border border-[#E5E2DC] bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-[#A37E5E]">{t('admin.activities.eyebrow')}</p>
                <h2 className="text-base font-semibold text-[#2B362E] sm:text-lg">{t('admin.activities.title')}</h2>
              </div>
              <span className="tabular-nums text-xs text-[#1C221E]/70">{t('admin.activities.latestCount', { count: number(activities.length) })}</span>
            </div>

            {activities.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-lg bg-[#FAF9F5] px-5 py-8 text-center">
                <ChartNoAxesCombined className="h-6 w-6 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" />
                <h3 className="text-sm font-semibold text-[#2B362E]">{t('admin.activities.emptyTitle')}</h3>
                <p className="max-w-prose text-xs leading-relaxed text-[#1C221E]/75">{t('admin.activities.emptyBody')}</p>
                <Link className="button-primary h-10 px-4 text-xs" to="/admin/users-companies">{t('admin.actions.manageUsers')}</Link>
              </div>
            ) : (
              <ol className="divide-y divide-[#E5E2DC]">
                {activities.map((activity, index) => {
                  const Icon = activityIcons[activity.type] || FileText;
                  const link = activity.type === 'job_post_published' ? '/admin/catalog' : '/admin/users-companies';
                  const translationKey = `admin.activities.types.${activity.type}`;

                  return (
                    <motion.li key={`${activity.type}-${activity.entity_id}-${activity.occurred_at}-${index}`} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: index * 0.025 }}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FAF9F5] text-[#2B362E]">
                        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="text-xs font-semibold text-[#2B362E]">{t(translationKey, { defaultValue: t('admin.activities.types.other') })}</p>
                          <time className="text-[10px] text-[#1C221E]/60" dateTime={activity.occurred_at}>{formatActivityDate(activity.occurred_at, i18n.language)}</time>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-[#1C221E]/80" dir="auto">{activity.description || t(translationKey, { defaultValue: t('admin.activities.types.other') })}</p>
                      </div>
                      <Link className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[10px] font-medium text-[#2B362E] transition-colors duration-150 hover:bg-[#FAF9F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]" to={link}>
                        {t('admin.activities.open')}<ArrowUpRight className="h-3 w-3 rtl:rotate-180" strokeWidth={1.75} aria-hidden="true" />
                      </Link>
                    </motion.li>
                  );
                })}
              </ol>
            )}
          </article>

          <aside className="rounded-xl border border-[#E5E2DC] bg-white p-6 shadow-sm">
            <p className="mb-2 text-xs font-semibold tracking-wide text-[#A37E5E]">{t('admin.summary.eyebrow')}</p>
            <h2 className="text-base font-semibold text-[#2B362E] sm:text-lg">{t('admin.summary.title')}</h2>
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-[#E5E2DC] pb-4">
                <span className="inline-flex items-center gap-2 text-xs text-[#1C221E]/75"><ChartNoAxesCombined className="h-4 w-4 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" />{t('admin.summary.averageMatch')}</span>
                <span className="tabular-nums text-sm font-semibold text-[#2B362E]">{stats.average_ai_match_score == null ? '—' : `${number(stats.average_ai_match_score)}%`}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-[#E5E2DC] pb-4">
                <span className="inline-flex items-center gap-2 text-xs text-[#1C221E]/75"><CircleDollarSign className="h-4 w-4 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" />{t('admin.summary.totalRevenue')}</span>
                <span className="tabular-nums text-sm font-semibold text-[#2B362E]">{stats.total_revenue == null ? '—' : number(stats.total_revenue)}</span>
              </div>
              <Link className="button-primary h-10 w-full px-4 text-xs" to="/admin/users-companies">{t('admin.actions.manageUsers')}<ArrowUpRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.75} aria-hidden="true" /></Link>
              <Link className="button-secondary h-10 w-full px-4 text-xs" to="/admin/catalog">{t('admin.actions.manageCatalog')}</Link>
            </div>
          </aside>
        </section>
      )}

      {isLoading && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(16rem,0.85fr)]" aria-busy="true">
          <div className="rounded-xl border border-[#E5E2DC] bg-white p-6"><ActivitySkeleton /></div>
          <div className="rounded-xl border border-[#E5E2DC] bg-white p-6"><div className="animate-pulse space-y-5"><div className="h-4 w-1/2 rounded-lg bg-[#E5E2DC]/60" /><div className="h-10 rounded-lg bg-[#E5E2DC]/60" /><div className="h-10 rounded-lg bg-[#E5E2DC]/60" /></div></div>
        </div>
      )}
    </div>
  );
}
