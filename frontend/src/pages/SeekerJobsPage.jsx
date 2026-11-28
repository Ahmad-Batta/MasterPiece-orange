import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { BriefcaseBusiness, MapPin, Search, ShieldCheck, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import Button from '../components/Button';
import FormField from '../components/FormField';
import IconBadge from '../components/IconBadge';
import JobCardSkeleton from '../components/JobCardSkeleton';
import ModalShell from '../components/ModalShell';
import PaginationBar from '../components/PaginationBar';
import { useToast } from '../context/ToastContext';
import { getApiData, getApiItems } from '../utils/apiResponse';

async function allApplications(signal) {
  const first = getApiData(await api.get('/seeker/applications', { signal }));
  const pages = Number(first.pagination?.last_page || 1);
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, index) => api.get('/seeker/applications', { params: { page: index + 2 }, signal }).then(getApiData)));
  return [first, ...rest].flatMap((page) => getApiItems(page));
}

function JobDetails({ job, applied, applying, onApply, onClose, t, language }) {
  const company = job.company?.name || t('jobs.companyFallback');
  const salary = [job.salary_min, job.salary_max].filter((value) => value != null).map((value) => new Intl.NumberFormat(language === 'ar' ? 'ar-JO' : 'en-US').format(value)).join(' – ');
  return <ModalShell className="fixed inset-0 z-50 flex items-center justify-center bg-[#161D19]/70 p-4" onClose={onClose} canClose={!applying}>
    <section role="dialog" aria-modal="true" aria-labelledby="job-details-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#E5E2D9] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4"><IconBadge icon={BriefcaseBusiness} tone="bronze" /><button type="button" className="button-secondary h-10 w-10 px-0" onClick={onClose} disabled={applying} aria-label={t('common.close')}><X className="h-4 w-4" strokeWidth={1.75} /></button></div>
      <h2 id="job-details-title" className="mt-4 text-xl font-semibold text-[#2B362E]" dir="auto">{job.title}</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#1C221E]/75"><span dir="auto">{company}</span>{job.company?.verification_status === 'verified' && <span className="inline-flex items-center gap-1 rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-2 py-1 text-xs text-[#15803D]"><ShieldCheck className="h-4 w-4" strokeWidth={1.75} />{t('jobs.verified')}</span>}</div>
      <dl className="mt-6 grid gap-4 rounded-xl border border-[#E5E2D9] bg-[#FAF9F5] p-6 text-sm sm:grid-cols-2">
        {[['category', job.category], ['location', job.location || job.company?.location], ['type', job.job_type], ['salary', salary], ['experience', job.experience_level]].map(([key, value]) => <div key={key}><dt className="text-xs font-medium text-[#1C221E]/60">{t(`seeker.jobs.${key}`)}</dt><dd className="mt-1 font-medium text-[#2B362E] tabular-nums" dir="auto">{value || t('seeker.jobs.unspecified')}</dd></div>)}
      </dl>
      <div className="mt-6"><h3 className="text-base font-semibold text-[#2B362E]">{t('seeker.jobs.description')}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1C221E]/80" dir="auto">{job.description || t('seeker.jobs.unspecified')}</p></div>
      <div className="mt-6"><h3 className="text-base font-semibold text-[#2B362E]">{t('seeker.jobs.requirements')}</h3>{job.required_skills?.length ? <ul className="mt-3 flex flex-wrap gap-2">{job.required_skills.map((skill) => <li key={skill} className="rounded-full border border-[#E5E2D9] bg-[#FAF9F5] px-3 py-1 text-xs text-[#2B362E]" dir="auto">{skill}</li>)}</ul> : <p className="mt-2 text-sm text-[#1C221E]/70">{t('seeker.jobs.unspecified')}</p>}</div>
      <div className="mt-8 flex flex-wrap gap-3">{applied ? <span className="inline-flex h-10 items-center rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-4 text-sm font-medium text-[#15803D]">{t('seeker.jobs.applied')}</span> : <Button loading={applying} onClick={() => onApply(job.id)}>{t('seeker.jobs.apply')}</Button>}<Link className="button-secondary" to="/seeker/applications">{t('seeker.navigation.applications')}</Link></div>
    </section>
  </ModalShell>;
}

export default function SeekerJobsPage() {
  const { t, i18n } = useTranslation();
  const { notify } = useToast();
  const [draft, setDraft] = useState({ keyword: '', category_id: '', location: '', job_type: '' });
  const [filters, setFilters] = useState(draft);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ last_page: 1, total: 0 });
  const [categories, setCategories] = useState([]);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [selected, setSelected] = useState(null);
  const [applying, setApplying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { const controller = new AbortController(); api.get('/categories', { signal: controller.signal }).then((response) => setCategories(getApiItems(getApiData(response)))).catch(() => {}); return () => controller.abort(); }, []);
  useEffect(() => { const controller = new AbortController(); allApplications(controller.signal).then((applications) => setAppliedIds(new Set(applications.map((application) => Number(application.job?.id)).filter(Boolean)))).catch(() => {}); return () => controller.abort(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(false);
    const params = { ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), page };
    (async () => {
      const result = getApiData(await api.get('/jobs', { params, signal: controller.signal }));
      setItems(getApiItems(result));
      setPagination(result.pagination || { last_page: 1, total: 0 });
    })().catch((reason) => { if (reason.code !== 'ERR_CANCELED') setError(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, page, attempt]);

  const types = useMemo(() => ['full-time', 'part-time', 'contract', 'internship', 'remote'], []);
  const apply = async (id) => {
    setApplying(true);
    try { await api.post(`/jobs/${id}/apply`); setAppliedIds((current) => new Set(current).add(Number(id))); notify(t('seeker.jobs.applySuccess')); }
    catch (reason) {
      if (reason.response?.status === 409) {
        try {
          const applications = await allApplications();
          if (applications.some((application) => Number(application.job?.id) === Number(id))) setAppliedIds((current) => new Set(current).add(Number(id)));
        } catch { /* Keep the conflict message if history cannot be reloaded. */ }
        notify(t('seeker.jobs.alreadyApplied'));
      } else notify(t('seeker.jobs.applyError'), 'error');
    }
    finally { setApplying(false); }
  };
  const labels = { page: (current, total) => t('seeker.pagination.page', { current, total }), previous: t('seeker.pagination.previous'), next: t('seeker.pagination.next'), previousPage: t('admin.usersCompanies.previousPage'), nextPage: t('admin.usersCompanies.nextPage') };

  return <section className="space-y-8">
    <header className="flex items-center gap-4"><IconBadge icon={Search} large /><div><h1 className="section-title">{t('seeker.navigation.jobs')}</h1><p className="mt-1 text-sm text-[#1C221E]/70">{t('seeker.jobs.intro')}</p></div></header>
    <form className="surface-card grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={(event) => { event.preventDefault(); setPage(1); setFilters({ ...draft }); }}>
      <FormField label={t('seeker.jobs.keyword')} value={draft.keyword} onChange={(event) => setDraft({ ...draft, keyword: event.target.value })} placeholder={t('seeker.jobs.keywordPlaceholder')} />
      <div><label htmlFor="seeker-job-category" className="mb-2 block text-sm font-semibold text-[#2B362E]">{t('seeker.jobs.category')}</label><select id="seeker-job-category" className="control-input" value={draft.category_id} onChange={(event) => setDraft({ ...draft, category_id: event.target.value })}><option value="">{t('seeker.jobs.allCategories')}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
      <FormField label={t('seeker.jobs.location')} value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} placeholder={t('seeker.jobs.locationPlaceholder')} />
      <div><label htmlFor="seeker-job-type" className="mb-2 block text-sm font-semibold text-[#2B362E]">{t('seeker.jobs.type')}</label><select id="seeker-job-type" className="control-input" value={draft.job_type} onChange={(event) => setDraft({ ...draft, job_type: event.target.value })}><option value="">{t('seeker.jobs.allTypes')}</option>{types.map((type) => <option key={type} value={type}>{t(`seeker.jobs.types.${type}`)}</option>)}</select></div>
      <div className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-4"><Button type="submit">{t('common.search')}</Button><Button variant="secondary" onClick={() => { const reset = { keyword: '', category_id: '', location: '', job_type: '' }; setDraft(reset); setFilters(reset); setPage(1); }}>{t('seeker.jobs.clear')}</Button></div>
    </form>
    {loading ? <div className="grid gap-6 md:grid-cols-2" role="status" aria-label={t('common.loading')}>{[0, 1, 2, 3].map((index) => <JobCardSkeleton key={index} />)}</div> : error ? <div className="surface-card text-center" role="alert"><p>{t('seeker.jobs.loadError')}</p><Button className="mt-4" onClick={() => setAttempt((value) => value + 1)}>{t('seeker.retry')}</Button></div> : items.length ? <><p className="text-xs text-[#1C221E]/70 tabular-nums">{t('seeker.jobs.resultCount', { count: pagination.total })}</p><div className="grid gap-6 md:grid-cols-2">{items.map((job) => <button key={job.id} type="button" className="surface-card flex cursor-pointer flex-col gap-4 text-start transition-colors duration-150 hover:border-[#2B362E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]" onClick={() => setSelected(job)}><IconBadge icon={BriefcaseBusiness} tone="bronze" /><span className="text-base font-semibold text-[#2B362E]" dir="auto">{job.title}</span><span className="flex flex-wrap items-center gap-2 text-sm text-[#1C221E]/75"><span dir="auto">{job.company?.name || t('jobs.companyFallback')}</span>{job.company?.verification_status === 'verified' && <span className="inline-flex items-center gap-1 rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-2 py-1 text-xs font-medium text-[#15803D]"><ShieldCheck className="h-4 w-4" strokeWidth={1.75} />{t('jobs.verified')}</span>}</span><span className="flex flex-wrap items-center gap-2 text-xs text-[#1C221E]/70"><MapPin className="h-4 w-4" strokeWidth={1.75} />{job.location || t('seeker.jobs.unspecified')} · {job.category || t('seeker.jobs.unspecified')}</span>{appliedIds.has(Number(job.id)) && <span className="self-start rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-1 text-xs font-medium text-[#15803D]">{t('seeker.jobs.applied')}</span>}</button>)}</div><PaginationBar page={page} lastPage={pagination.last_page} onChange={setPage} disabled={loading} labels={labels} /></> : <div className="surface-card flex flex-col items-center gap-3 text-center"><IconBadge icon={Search} large /><h2 className="text-lg font-semibold text-[#2B362E]">{t('seeker.jobs.emptyTitle')}</h2><p className="text-sm text-[#1C221E]/70">{t('seeker.jobs.emptyBody')}</p><Button onClick={() => { const reset = { keyword: '', category_id: '', location: '', job_type: '' }; setDraft(reset); setFilters(reset); setPage(1); }}>{t('seeker.jobs.clear')}</Button></div>}
    <AnimatePresence>{selected && <JobDetails job={selected} applied={appliedIds.has(Number(selected.id))} applying={applying} onApply={apply} onClose={() => setSelected(null)} t={t} language={i18n.language} />}</AnimatePresence>
  </section>;
}
