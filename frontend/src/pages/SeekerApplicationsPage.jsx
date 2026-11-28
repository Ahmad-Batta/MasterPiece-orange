import { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CalendarDays, ClipboardList, Search, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import Button from '../components/Button';
import IconBadge from '../components/IconBadge';
import PaginationBar from '../components/PaginationBar';
import { getApiData, getApiItems } from '../utils/apiResponse';

const PAGE_SIZE = 15;
const statusStyles = {
  Applied: 'border-[#E6D7C8] bg-[#F5EFEA] text-[#8E6B4D]',
  Pending: 'border-[#E6D7C8] bg-[#F5EFEA] text-[#8E6B4D]',
  pending: 'border-[#E6D7C8] bg-[#F5EFEA] text-[#8E6B4D]',
  Shortlisted: 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]',
  'Interview Scheduled': 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]',
  Offered: 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]',
  Rejected: 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]',
};

export default function SeekerApplicationsPage() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(false);
    (async () => {
      const first = getApiData(await api.get('/seeker/applications', { signal: controller.signal }));
      const count = Number(first.pagination?.last_page || 1);
      const rest = await Promise.all(Array.from({ length: Math.max(0, count - 1) }, (_, index) => api.get('/seeker/applications', { params: { page: index + 2 }, signal: controller.signal }).then(getApiData)));
      setItems([first, ...rest].flatMap((result) => getApiItems(result)));
    })().catch((reason) => { if (reason.code !== 'ERR_CANCELED') setError(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  const filtered = useMemo(() => status === 'all' ? items : items.filter((item) => item.status?.toLowerCase() === status.toLowerCase()), [items, status]);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const date = (value) => value ? new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-JO' : 'en-US', { dateStyle: 'medium' }).format(new Date(value)) : t('seeker.applications.unknownDate');
  const statusLabel = (value) => t(`seeker.applications.status.${value}`, { defaultValue: value || t('seeker.applications.unknownStatus') });
  const counters = [
    { key: 'total', value: items.length, Icon: ClipboardList },
    { key: 'review', value: items.filter((item) => ['applied', 'pending', 'interview scheduled', 'interview'].includes(item.status?.toLowerCase())).length, Icon: CalendarDays },
    { key: 'shortlisted', value: items.filter((item) => ['shortlisted', 'offered'].includes(item.status?.toLowerCase())).length, Icon: Star },
  ];
  const labels = { page: (current, total) => t('seeker.pagination.page', { current, total }), previous: t('seeker.pagination.previous'), next: t('seeker.pagination.next'), previousPage: t('admin.usersCompanies.previousPage'), nextPage: t('admin.usersCompanies.nextPage') };

  return <section className="space-y-8">
    <header className="flex items-center gap-4"><IconBadge icon={BriefcaseBusiness} large tone="bronze" /><div><h1 className="section-title">{t('seeker.navigation.applications')}</h1><p className="mt-1 text-sm text-[#1C221E]/70">{t('seeker.applications.intro')}</p></div></header>
    {loading ? <div className="grid gap-6 sm:grid-cols-3" role="status" aria-label={t('common.loading')}>{[0, 1, 2].map((item) => <div key={item} className="surface-card animate-pulse"><div className="h-12 w-12 rounded-2xl bg-[#E5E2D9]/60" /><div className="mt-4 h-8 w-1/3 rounded-lg bg-[#E5E2D9]/60" /></div>)}</div> : error ? <div className="surface-card text-center" role="alert"><p>{t('seeker.applications.loadError')}</p><Button className="mt-4" onClick={() => setAttempt((value) => value + 1)}>{t('seeker.retry')}</Button></div> : <>
      <div className="grid gap-6 sm:grid-cols-3">{counters.map(({ key, value, Icon }) => <div key={key} className="surface-card"><IconBadge icon={Icon} tone={key === 'shortlisted' ? 'bronze' : 'olive'} /><p className="mt-4 text-2xl font-semibold text-[#2B362E] tabular-nums">{value}</p><p className="mt-1 text-xs text-[#1C221E]/70">{t(`seeker.applications.counters.${key}`)}</p></div>)}</div>
      <div className="surface-card"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-lg font-semibold text-[#2B362E]">{t('seeker.applications.history')}</h2><p className="mt-1 text-xs text-[#1C221E]/70">{t('seeker.applications.resultCount', { count: filtered.length })}</p></div><div><label htmlFor="application-status" className="mb-2 block text-sm font-semibold text-[#2B362E]">{t('common.status')}</label><select id="application-status" className="control-input min-w-40" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="all">{t('seeker.applications.allStatuses')}</option>{['Applied', 'Pending', 'Shortlisted', 'Interview Scheduled', 'Offered', 'Rejected'].map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></div></div>
        {visible.length ? <div className="mt-6 space-y-4">{visible.map((item) => <article key={item.id} className="rounded-xl border border-[#E5E2D9] bg-[#FAF9F5] p-6"><div className="flex flex-wrap items-start gap-4"><IconBadge icon={BriefcaseBusiness} /><div className="min-w-0 flex-1"><h3 className="text-base font-semibold text-[#2B362E]" dir="auto">{item.job?.title || t('seeker.applications.unavailableJob')}</h3><p className="mt-1 text-sm text-[#1C221E]/70" dir="auto">{item.job?.company?.name || t('jobs.companyFallback')}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[item.status] || 'border-[#E5E2D9] bg-white text-[#2B362E]'}`}>{statusLabel(item.status)}</span></div><div className="mt-4 flex flex-wrap gap-4 text-xs text-[#1C221E]/70"><span>{t('seeker.applications.appliedDate', { date: date(item.applied_at) })}</span>{item.interview_date && <span>{t('seeker.applications.interviewDate', { date: date(item.interview_date) })}</span>}{item.match_percentage != null && <span className="tabular-nums">{t('seeker.applications.match', { value: item.match_percentage })}</span>}</div>{item.interview_link && <a className="mt-4 inline-flex text-sm font-medium text-[#2B362E] underline decoration-[#A37E5E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]" href={item.interview_link} target="_blank" rel="noopener noreferrer">{t('seeker.applications.interviewLink')}</a>}</article>)}</div> : <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-[#E5E2D9] bg-[#FAF9F5] p-6 text-center"><IconBadge icon={Search} large /><h3 className="text-base font-semibold text-[#2B362E]">{t('seeker.applications.emptyTitle')}</h3><p className="text-sm text-[#1C221E]/70">{t('seeker.applications.emptyBody')}</p><div className="flex flex-wrap justify-center gap-3"><Link className="button-primary" to="/seeker/jobs">{t('seeker.navigation.jobs')}</Link><Link className="button-secondary" to="/seeker/cv-builder">{t('seeker.navigation.cv')}</Link></div></div>}
        <div className="mt-6"><PaginationBar page={page} lastPage={Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))} onChange={setPage} labels={labels} /></div>
      </div>
    </>}
  </section>;
}
