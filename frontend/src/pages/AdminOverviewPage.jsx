import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, BriefcaseBusiness, Building2, ChartNoAxesCombined, CircleDollarSign, FileText, RefreshCw, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { getApiData, getApiItems } from '../utils/apiResponse';

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

function buildActivitySeries(days, language) {
  let cumulative = 0;
  const formatter = new Intl.DateTimeFormat(language === 'ar' ? 'ar-JO' : 'en-US', { weekday: 'short' });
  return days.map((day) => {
    const date = new Date(`${day.date}T12:00:00`);
    const events = Number(day.events) || 0;
    cumulative += events;
    return { date, label: formatter.format(date), events, cumulative };
  });
}

function splinePath(points) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const beforePrevious = points[index - 2] || previous;
    const next = points[index + 1] || point;
    const controlOne = { x: previous.x + (point.x - beforePrevious.x) / 6, y: previous.y + (point.y - beforePrevious.y) / 6 };
    const controlTwo = { x: point.x - (next.x - previous.x) / 6, y: point.y - (next.y - previous.y) / 6 };
    return `${path} C ${controlOne.x} ${controlOne.y}, ${controlTwo.x} ${controlTwo.y}, ${point.x} ${point.y}`;
  }, '');
}

function PlatformDonut({ stats, t, number, reducedMotion }) {
  const [activeKey, setActiveKey] = useState(null);
  const segments = [
    { key: 'seekers', value: Number(stats.total_seekers) || 0, color: '#2B362E' },
    { key: 'companies', value: Number(stats.total_companies) || 0, color: '#5C6F61' },
    { key: 'activeJobs', value: Number(stats.active_job_posts) || 0, color: '#A37E5E' },
    { key: 'applications', value: Number(stats.total_applications) || 0, color: '#2B362E', opacity: 0.42 },
  ];
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  const circumference = 2 * Math.PI * 66;
  let offset = 0;
  const activeSegment = segments.find((segment) => segment.key === activeKey);

  return (
    <article className="rounded-xl border border-[#2B362E]/10 bg-white p-6 shadow-sm lg:col-span-5">
      <p className="text-xs font-semibold tracking-wide text-[#A37E5E]">{t('admin.charts.platformEyebrow')}</p>
      <h2 className="mt-2 text-base font-semibold text-[#2B362E] sm:text-lg">{t('admin.charts.platformTitle')}</h2>
      <p className="mt-1 max-w-prose text-xs leading-7 text-[#1C221E]/70">{t('admin.charts.platformSubtitle')}</p>

      <div className="mt-5 grid items-center gap-5 sm:grid-cols-[minmax(10rem,0.9fr)_minmax(0,1.1fr)]">
        <div className="relative mx-auto aspect-square w-full max-w-52" role="img" aria-label={t('admin.charts.platformAria', { count: number(total) })}>
          <svg className="h-full w-full overflow-visible" viewBox="0 0 200 200" aria-hidden="true">
            <circle cx="100" cy="100" r="66" fill="none" stroke="#FAF9F5" strokeWidth="15" />
            {total > 0 && segments.map((segment, index) => {
              const value = Math.max(0, segment.value);
              const length = (value / total) * circumference;
              const currentOffset = offset;
              offset += length;
              return (
                <motion.circle
                  key={segment.key}
                  cx="100"
                  cy="100"
                  r="66"
                  fill="none"
                  stroke={segment.color}
                  strokeOpacity={segment.opacity ?? 1}
                  strokeWidth={activeKey === segment.key ? 19 : 15}
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-currentOffset}
                  strokeLinecap="butt"
                  transform="rotate(-90 100 100)"
                  initial={{ opacity: 0, strokeDashoffset: -(currentOffset + length) }}
                  animate={{ opacity: activeKey && activeKey !== segment.key ? 0.45 : 1, strokeDashoffset: -currentOffset }}
                  transition={{ duration: reducedMotion ? 0 : 0.55, delay: reducedMotion ? 0 : index * 0.07 }}
                  onMouseEnter={() => setActiveKey(segment.key)}
                  onMouseLeave={() => setActiveKey(null)}
                />
              );
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="max-w-28 text-[10px] font-medium leading-relaxed text-[#1C221E]/65">{activeSegment ? t(`admin.charts.${activeSegment.key}`) : t('admin.charts.total')}</span>
            <strong className="tabular-nums text-2xl font-semibold tracking-tight text-[#2B362E]">{number(activeSegment?.value ?? total)}</strong>
          </div>
        </div>

        <div className="grid gap-2">
          {segments.map((segment) => (
            <button key={segment.key} className={`flex min-h-10 items-center justify-between gap-3 rounded-lg border px-3 text-start transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] ${activeKey === segment.key ? 'border-[#2B362E]/20 bg-[#FAF9F5]' : 'border-[#2B362E]/10 bg-white hover:bg-[#FAF9F5]'}`} type="button" onMouseEnter={() => setActiveKey(segment.key)} onMouseLeave={() => setActiveKey(null)} onFocus={() => setActiveKey(segment.key)} onBlur={() => setActiveKey(null)}>
              <span className="flex min-w-0 items-center gap-2 text-xs text-[#1C221E]"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color, opacity: segment.opacity ?? 1 }} />{t(`admin.charts.${segment.key}`)}</span>
              <span className="tabular-nums text-xs font-semibold text-[#2B362E]">{number(segment.value)}</span>
            </button>
          ))}
        </div>
      </div>
      {total === 0 && <p className="mt-3 text-xs leading-7 text-[#1C221E]/70">{t('admin.charts.noPlatformData')}</p>}
    </article>
  );
}

function ActivityTrajectory({ series, revenue, t, number, language, reducedMotion }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const chart = { left: 44, right: 612, top: 38, bottom: 190 };
  const maximum = Math.max(1, ...series.map((point) => point.events));
  const points = series.map((point, index) => ({
    ...point,
    x: chart.left + (index * (chart.right - chart.left)) / Math.max(1, series.length - 1),
    y: chart.bottom - (point.events / maximum) * (chart.bottom - chart.top),
  }));
  const line = splinePath(points);
  const area = `${line} L ${chart.right} ${chart.bottom} L ${chart.left} ${chart.bottom} Z`;
  const active = points[selectedIndex ?? points.length - 1];
  const dateText = active ? new Intl.DateTimeFormat(language === 'ar' ? 'ar-JO' : 'en-US', { dateStyle: 'medium' }).format(active.date) : '';

  return (
    <article className="rounded-xl border border-[#2B362E]/10 bg-white p-6 shadow-sm lg:col-span-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[#A37E5E]">{t('admin.charts.trajectoryEyebrow')}</p>
          <h2 className="mt-2 text-base font-semibold text-[#2B362E] sm:text-lg">{t('admin.charts.trajectoryTitle')}</h2>
          <p className="mt-1 max-w-prose text-xs leading-7 text-[#1C221E]/70">{t('admin.charts.trajectorySubtitle')}</p>
        </div>
        <div className="rounded-lg border border-[#2B362E]/10 bg-[#FAF9F5] px-3 py-2">
          <p className="text-[10px] font-medium text-[#1C221E]/65">{t('admin.charts.revenueTotal')}</p>
          <p className="tabular-nums text-sm font-semibold text-[#2B362E]">{number(revenue)}</p>
        </div>
      </div>

      <div className="relative mt-4" onMouseLeave={() => setSelectedIndex(null)}>
        {active && <div className="pointer-events-none absolute end-2 top-2 z-10 rounded-lg border border-[#2B362E]/10 bg-white/95 px-3 py-2 text-xs shadow-sm" role="status" aria-live="polite">
          <p className="font-semibold text-[#2B362E]">{dateText}</p>
          <p className="mt-1 tabular-nums text-[#1C221E]/75">{t('admin.charts.dailyActivity', { count: number(active.events) })}</p>
          <p className="tabular-nums text-[#1C221E]/75">{t('admin.charts.cumulativeActivity', { count: number(active.cumulative) })}</p>
        </div>}
        <svg className="h-auto w-full overflow-visible" viewBox="0 0 640 230" role="group" aria-label={t('admin.charts.trajectoryAria')}>
          <defs>
            <linearGradient id="admin-activity-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2B362E" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#2B362E" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((step) => {
            const y = chart.top + (step * (chart.bottom - chart.top)) / 3;
            return <line key={step} x1={chart.left} x2={chart.right} y1={y} y2={y} stroke="#2B362E" strokeOpacity="0.12" strokeDasharray="4 6" />;
          })}
          <motion.path d={area} fill="url(#admin-activity-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reducedMotion ? 0 : 0.6 }} />
          <motion.path d={line} fill="none" stroke="#2B362E" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reducedMotion ? 0 : 0.8, ease: 'easeOut' }} />
          {points.map((point, index) => (
            <g key={point.date.toISOString()} onMouseEnter={() => setSelectedIndex(index)} onFocus={() => setSelectedIndex(index)}>
              <circle cx={point.x} cy={point.y} r="12" fill="transparent" />
              <motion.circle className="cursor-crosshair focus-visible:outline-none focus-visible:stroke-[#A37E5E] focus-visible:stroke-[4]" cx={point.x} cy={point.y} r={selectedIndex === index ? 5 : 3.5} fill="#FAF9F5" stroke="#2B362E" strokeWidth="2.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reducedMotion ? 0 : 0.25, delay: reducedMotion ? 0 : index * 0.04 }} tabIndex={0} role="button" aria-label={t('admin.charts.pointAria', { date: new Intl.DateTimeFormat(language === 'ar' ? 'ar-JO' : 'en-US', { dateStyle: 'medium' }).format(point.date), count: number(point.events) })} />
            </g>
          ))}
          {points.filter((_, index) => index % 2 === 0 || index === points.length - 1).map((point) => <text key={`label-${point.date.toISOString()}`} x={point.x} y="218" textAnchor="middle" fill="#1C221E" fillOpacity="0.65" className="text-[10px]">{point.label}</text>)}
        </svg>
        {series.every((point) => point.events === 0) && <p className="mt-1 text-center text-xs text-[#1C221E]/65">{t('admin.charts.noRecentActivity')}</p>}
      </div>
    </article>
  );
}

function SpecializationBars({ categories, t, number, reducedMotion }) {
  const rows = [...categories]
    .map((item) => ({ ...item, count: Math.max(0, Number(item.count) || 0), label: item.category ?? item.category_name ?? item.name ?? '' }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);
  const maximum = Math.max(1, ...rows.map((item) => item.count));

  return (
    <article className="rounded-xl border border-[#2B362E]/10 bg-white p-6 shadow-sm lg:col-span-12">
      <p className="text-xs font-semibold tracking-wide text-[#A37E5E]">{t('admin.charts.specializationEyebrow')}</p>
      <h2 className="mt-2 text-base font-semibold text-[#2B362E] sm:text-lg">{t('admin.charts.specializationTitle')}</h2>
      <p className="mt-1 max-w-prose text-xs leading-7 text-[#1C221E]/70">{t('admin.charts.specializationSubtitle')}</p>
      {rows.length === 0 ? (
        <div className="mt-5 rounded-lg bg-[#FAF9F5] p-4 text-xs leading-7 text-[#1C221E]/70">{t('admin.charts.noSpecializationData')}</div>
      ) : (
        <div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((item, index) => {
            const percentage = (item.count / maximum) * 100;
            return (
              <div key={item.category_id ?? item.id ?? item.label} role="img" aria-label={t('admin.charts.categoryAria', { category: item.label, count: number(item.count) })}>
                <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate font-medium text-[#1C221E]" dir="auto">{item.label || t('admin.charts.unnamedCategory')}</span>
                  <span className="tabular-nums shrink-0 font-semibold text-[#2B362E]">{number(item.count)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#FAF9F5]">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: index % 3 === 1 ? '#5C6F61' : (index % 3 === 2 ? '#A37E5E' : '#2B362E') }} initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: reducedMotion ? 0 : 0.55, delay: reducedMotion ? 0 : index * 0.04, ease: 'easeOut' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

const activityIcons = {
  application: FileText,
  seeker_registered: Users,
  company_registered: Building2,
  job_post_published: BriefcaseBusiness,
};

export default function AdminOverviewPage() {
  const { t, i18n } = useTranslation();
  const reducedMotion = useReducedMotion();
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
      setStats(getApiData(results[0].value));
    } else {
      setStats(null);
      setHasError(true);
    }

    if (results[1].status === 'fulfilled') {
      setPendingVerifications(paginationTotal(getApiData(results[1].value)));
    } else {
      setPendingVerifications(null);
    }

    if (results[2].status === 'fulfilled') {
      setPaidTransactions(paginationTotal(getApiData(results[2].value)));
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
  const activitySeries = useMemo(() => buildActivitySeries(stats?.activity_daily || [], i18n.language), [stats, i18n.language]);
  const categorySeries = Array.isArray(stats?.jobs_by_category) ? stats.jobs_by_category : [];
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

      {isLoading ? (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12" aria-label={t('admin.charts.loadingLabel')} aria-busy="true">
          <div className="animate-pulse rounded-xl border border-[#2B362E]/10 bg-white p-6 lg:col-span-5"><div className="h-4 w-1/2 rounded-lg bg-[#E5E2DC]/60" /><div className="mt-5 h-48 rounded-lg bg-[#E5E2DC]/60" /></div>
          <div className="animate-pulse rounded-xl border border-[#2B362E]/10 bg-white p-6 lg:col-span-7"><div className="h-4 w-1/2 rounded-lg bg-[#E5E2DC]/60" /><div className="mt-5 h-48 rounded-lg bg-[#E5E2DC]/60" /></div>
          <div className="animate-pulse rounded-xl border border-[#2B362E]/10 bg-white p-6 lg:col-span-12"><div className="h-4 w-1/3 rounded-lg bg-[#E5E2DC]/60" /><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-10 rounded-lg bg-[#E5E2DC]/60" />)}</div></div>
        </section>
      ) : stats && (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12" aria-label={t('admin.charts.sectionLabel')}>
          <PlatformDonut stats={stats} t={t} number={number} reducedMotion={reducedMotion} />
          <ActivityTrajectory series={activitySeries} revenue={stats.total_revenue} t={t} number={number} language={i18n.language} reducedMotion={reducedMotion} />
          <SpecializationBars categories={categorySeries} t={t} number={number} reducedMotion={reducedMotion} />
        </section>
      )}

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
                <Link className="button-primary h-10 px-4 text-xs" to="/admin/users">{t('admin.actions.manageUsers')}</Link>
              </div>
            ) : (
              <ol className="divide-y divide-[#E5E2DC]">
                {activities.map((activity, index) => {
                  const Icon = activityIcons[activity.type] || FileText;
                  const link = activity.type === 'job_post_published' ? '/admin/jobs' : activity.type === 'company_registered' ? '/admin/companies' : '/admin/users';
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
              <Link className="button-primary h-10 w-full px-4 text-xs" to="/admin/users">{t('admin.actions.manageUsers')}<ArrowUpRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.75} aria-hidden="true" /></Link>
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
