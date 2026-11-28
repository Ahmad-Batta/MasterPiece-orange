import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { ClipboardList, MessageSquareText, ShieldCheck, Sparkles, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import Button from '../components/Button';
import FormField from '../components/FormField';
import IconBadge from '../components/IconBadge';
import ModalShell from '../components/ModalShell';
import PaginationBar from '../components/PaginationBar';
import ProfileAvatar from '../components/ProfileAvatar';
import { useToast } from '../context/ToastContext';
import { getApiData, getApiItems } from '../utils/apiResponse';
import { getValidationErrors } from '../utils/validationErrors';

const statuses = ['Applied', 'Shortlisted', 'Interview Scheduled', 'Offered', 'Rejected'];

async function allPages(path, signal) {
  const first = getApiData(await api.get(path, { signal }));
  const pages = Math.max(1, Number(first.pagination?.last_page) || 1);
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, index) => api.get(path, { params: { page: index + 2 }, signal }).then(getApiData)));
  return [first, ...rest].flatMap((page) => getApiItems(page));
}

function scoreClass(score) {
  if (score === null || score === undefined) return 'border-[#E5E2D9] bg-[#FAF9F5] text-[#1C221E]';
  if (score >= 75) return 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]';
  if (score >= 50) return 'border-[#E6D7C8] bg-[#F5EFEA] text-[#8E6B4D]';
  return 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]';
}

export default function CompanyApplicantsPage() {
  const { t, i18n } = useTranslation();
  const { notify } = useToast();
  const [jobs, setJobs] = useState([]);
  const [jobId, setJobId] = useState('');
  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, last_page: 1 });
  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('score');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState('Applied');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewLink, setInterviewLink] = useState('');
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(false);
    Promise.all([allPages('/company/jobs', controller.signal), api.get('/company/profile', { signal: controller.signal })])
      .then(([items, profile]) => { setJobs(items); setQuota(getApiData(profile)); })
      .catch((reason) => { if (reason.code !== 'ERR_CANCELED') setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    if (!jobId) { setApplications([]); setPagination({ total: 0, last_page: 1 }); return undefined; }
    const controller = new AbortController();
    setLoading(true); setError(false); setApplications([]);
    api.get(`/company/jobs/${jobId}/applicants`, { params: { page, sort: sort === 'newest' ? 'latest' : 'match_score', ...(statusFilter !== 'all' ? { status: statusFilter } : {}) }, signal: controller.signal })
      .then((response) => { const payload = getApiData(response); setApplications(getApiItems(payload)); setPagination(payload.pagination || { total: 0, last_page: 1 }); })
      .catch((reason) => { if (reason.code !== 'ERR_CANCELED') setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [jobId, page, sort, statusFilter, retry]);

  const visible = applications;
  const lastPage = Math.max(1, Number(pagination.last_page) || 1);
  const changeFilter = (setter) => (event) => { setter(event.target.value); setPage(1); };
  const open = (item) => {
    setSelected(item); setDecision(statuses.includes(item.status) ? item.status : 'Applied');
    setInterviewDate(item.interview_date ? item.interview_date.slice(0, 16) : '');
    setInterviewLink(item.interview_link || ''); setNotes(item.company_notes || ''); setFieldErrors({});
  };
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setFieldErrors({});
    try {
      const response = await api.patch(`/company/applications/${selected.id}/status`, {
        status: decision, interview_date: decision === 'Interview Scheduled' ? interviewDate || null : null,
        interview_link: decision === 'Interview Scheduled' ? interviewLink || null : null, company_notes: notes || null,
      });
      const updated = getApiData(response);
      setApplications((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelected(updated); notify(t('companyApplicants.saved'));
    } catch (reason) {
      const fields = getValidationErrors(reason);
      if (fields) setFieldErrors(fields); else notify(t('companyApplicants.saveError'), 'error');
    } finally { setSaving(false); }
  };
  const copyQuestions = async () => {
    try { await navigator.clipboard.writeText((selected.interview_questions || []).map((question, index) => `${index + 1}. ${question}`).join('\n')); notify(t('companyApplicants.copied')); }
    catch { notify(t('companyApplicants.copyError'), 'error'); }
  };
  const downloadCv = async () => {
    setDownloading(true);
    try {
      const response = await api.get(`/company/applications/${selected.id}/cv`, { responseType: 'blob' });
      const blob = response.data;
      const type = response.headers['content-type'] || blob.type;
      const extension = type?.includes('wordprocessingml') ? 'docx' : 'pdf';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `candidate-cv.${extension}`;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { notify(t('companyApplicants.cvError'), 'error'); }
    finally { setDownloading(false); }
  };
  const review = async () => {
    setReviewing(true);
    try {
      const response = await api.post(`/company/applications/${selected.id}/ai-review`);
      const updated = getApiData(response);
      setSelected(updated);
      setApplications((current) => current.map((item) => item.id === updated.id ? updated : item));
      setQuota((current) => current ? { ...current, free_ai_uses_remaining: updated.free_ai_uses_remaining } : current);
      notify(t('companyApplicants.reviewed'));
      setRetry((value) => value + 1);
    } catch (reason) { if (reason.response?.status !== 402) notify(t('companyApplicants.reviewError'), 'error'); }
    finally { setReviewing(false); }
  };
  const labels = { page: (current, total) => t('seeker.pagination.page', { current, total }), previous: t('seeker.pagination.previous'), next: t('seeker.pagination.next'), previousPage: t('admin.usersCompanies.previousPage'), nextPage: t('admin.usersCompanies.nextPage') };
  const formatDate = (value) => value ? new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-JO' : 'en-US', { dateStyle: 'medium' }).format(new Date(value)) : '—';

  return <main id="main-content" className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
    <header className="flex items-center gap-4"><IconBadge icon={Users} large /><div><h1 className="section-title">{t('companyApplicants.title')}</h1><p className="mt-1 text-sm text-[#1C221E]/70">{t('companyApplicants.intro')}</p></div></header>
    <div className="grid gap-6 sm:grid-cols-3">
      {[[Users, 'total', pagination.total], [Sparkles, 'scored', applications.filter((item) => item.match_percentage != null).length], [ClipboardList, 'shortlisted', applications.filter((item) => ['Shortlisted', 'Interview Scheduled', 'Offered'].includes(item.status)).length]].map(([Icon, key, count]) => <div key={key} className="surface-card flex items-center gap-4"><IconBadge icon={Icon} large tone={key === 'scored' ? 'bronze' : 'olive'} /><div><p className="text-xs text-[#1C221E]/70">{t(`companyApplicants.${key}`)}</p><strong className="text-2xl tabular-nums text-[#2B362E]">{count}</strong></div></div>)}
    </div>
    <div className="surface-card grid gap-4 md:grid-cols-3">
      <div><label className="mb-2 block text-sm font-medium text-[#2B362E]" htmlFor="applicants-job">{t('companyApplicants.job')}</label><select id="applicants-job" className="control-input" value={jobId} onChange={(event) => { setJobId(event.target.value); setPage(1); }}><option value="">{t('companyApplicants.selectJob')}</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></div>
      <div><label className="mb-2 block text-sm font-medium text-[#2B362E]" htmlFor="applicants-status">{t('common.status')}</label><select id="applicants-status" className="control-input" value={statusFilter} onChange={changeFilter(setStatusFilter)}><option value="all">{t('companyApplicants.allStatuses')}</option>{statuses.map((status) => <option key={status} value={status}>{t(`companyApplicants.status.${status}`)}</option>)}</select></div>
      <div><label className="mb-2 block text-sm font-medium text-[#2B362E]" htmlFor="applicants-sort">{t('companyApplicants.sort')}</label><select id="applicants-sort" className="control-input" value={sort} onChange={changeFilter(setSort)}><option value="score">{t('companyApplicants.byScore')}</option><option value="newest">{t('companyApplicants.byNewest')}</option></select></div>
    </div>
    {loading ? <div className="grid gap-6 md:grid-cols-2" role="status" aria-label={t('common.loading')}>{[0, 1, 2, 3].map((key) => <div key={key} className="surface-card animate-pulse"><div className="h-12 w-12 rounded-2xl bg-[#E5E2D9]/60" /><div className="mt-4 h-6 w-1/2 rounded-lg bg-[#E5E2D9]/60" /></div>)}</div>
      : error ? <div className="surface-card" role="alert"><p>{t('companyApplicants.loadError')}</p><Button className="mt-4" onClick={() => setRetry((value) => value + 1)}>{t('companyApplicants.retry')}</Button></div>
        : !jobId || !visible.length ? <div className="surface-card flex flex-col items-center gap-3 text-center"><IconBadge icon={Users} large /><h2 className="font-semibold text-[#2B362E]">{t(!jobId ? 'companyApplicants.chooseJob' : 'companyApplicants.empty')}</h2><p className="text-sm text-[#1C221E]/70">{t(!jobId ? 'companyApplicants.chooseJobHint' : 'companyApplicants.emptyHint')}</p>{!jobs.length && <Link className="button-primary" to="/company/jobs">{t('companyWorkspace.jobsTitle')}</Link>}</div>
          : <><div className="grid gap-6 md:grid-cols-2">{visible.map((item) => <article key={item.id} className="surface-card flex flex-col gap-4"><div className="flex items-center gap-3"><ProfileAvatar src={item.candidate?.image_url} name={item.candidate?.name} className="h-12 w-12" /><div className="min-w-0 flex-1"><h2 className="font-semibold text-[#2B362E]" dir="auto">{item.candidate?.name || t('companyApplicants.unknown')}</h2><p className="text-xs text-[#1C221E]/70" dir="auto">{item.candidate?.headline || item.candidate?.major || t('companyApplicants.noHeadline')}</p></div><span className={`rounded-full border px-3 py-1 text-sm font-semibold tabular-nums ${scoreClass(item.match_percentage)}`}>{item.match_percentage == null ? '—' : `${item.match_percentage}%`}</span></div><p className="text-sm text-[#1C221E]/70" dir="auto">{item.job?.title}</p><div className="flex items-center justify-between gap-3"><span className="rounded-full border border-[#E5E2D9] bg-[#FAF9F5] px-3 py-1 text-xs text-[#2B362E]">{t(`companyApplicants.status.${item.status}`, { defaultValue: item.status })}</span><span className="text-xs tabular-nums text-[#1C221E]/60">{formatDate(item.applied_at)}</span></div><Button variant="secondary" className="mt-auto self-start" onClick={() => open(item)}>{t('companyApplicants.insights')}</Button></article>)}</div><PaginationBar page={page} lastPage={lastPage} onChange={setPage} labels={labels} /></>}
    <AnimatePresence>{selected && <ModalShell className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C221E]/50 p-4" onClose={() => !saving && setSelected(null)} canClose={!saving}><section role="dialog" aria-modal="true" aria-labelledby="candidate-title" className="max-h-[90vh] w-full max-w-3xl space-y-6 overflow-y-auto rounded-xl border border-[#E5E2D9] bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><ProfileAvatar src={selected.candidate?.image_url} name={selected.candidate?.name} className="h-14 w-14" /><div><h2 id="candidate-title" className="text-lg font-semibold text-[#2B362E]" dir="auto">{selected.candidate?.name || t('companyApplicants.unknown')}</h2><p className="text-sm text-[#1C221E]/70" dir="auto">{selected.candidate?.major}</p></div></div><button type="button" className="button-secondary h-10 w-10 px-0" aria-label={t('common.close')} onClick={() => setSelected(null)} disabled={saving}><X className="h-4 w-4" strokeWidth={1.75} /></button></div>
      <div className="flex flex-wrap items-center gap-3"><span className={`rounded-full border px-3 py-1 text-sm font-semibold tabular-nums ${scoreClass(selected.match_percentage)}`}>{t('companyApplicants.match')}: {selected.match_percentage == null ? '—' : `${selected.match_percentage}%`}</span><span className="rounded-full border border-[#E5E2D9] bg-[#FAF9F5] px-3 py-1 text-xs">{t(`companyApplicants.status.${selected.status}`, { defaultValue: selected.status })}</span></div>
      <div className="space-y-3"><h3 className="font-semibold text-[#2B362E]">{t('companyApplicants.profile')}</h3>{selected.candidate?.email && <a className="text-sm text-[#2B362E] underline focus-visible:ring-2 focus-visible:ring-[#A37E5E]" href={`mailto:${selected.candidate.email}`}>{selected.candidate.email}</a>}{selected.candidate?.city && <p className="text-sm text-[#1C221E]/70" dir="auto">{selected.candidate.city}</p>}<div className="flex flex-wrap gap-2">{(selected.candidate?.skills || []).map((skill) => <span key={skill} className="rounded-full border border-[#E5E2D9] bg-[#FAF9F5] px-3 py-1 text-xs" dir="auto">{skill}</span>)}</div>{selected.candidate?.has_cv ? <Button variant="secondary" loading={downloading} onClick={downloadCv}>{t('companyApplicants.downloadCv')}</Button> : <p className="text-xs text-[#1C221E]/70">{t('companyApplicants.noCv')}</p>}</div>
      <div className="grid gap-4 sm:grid-cols-2">{[['strengths', 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]'], ['weaknesses', 'border-[#E6D7C8] bg-[#F5EFEA] text-[#8E6B4D]']].map(([key, style]) => <div key={key} className={`rounded-xl border p-6 ${style}`}><div className="flex items-center gap-3"><IconBadge icon={key === 'strengths' ? ShieldCheck : ClipboardList} /><h3 className="font-semibold">{t(`companyApplicants.${key}`)}</h3></div>{selected[key]?.length ? <ul className="mt-4 list-inside list-disc space-y-2 text-sm">{selected[key].map((line, index) => <li key={index} dir="auto">{line}</li>)}</ul> : <p className="mt-4 text-sm">{t('companyApplicants.noReport')}</p>}</div>)}</div>
      <div className="flex flex-wrap items-center gap-3"><Button onClick={review} loading={reviewing} disabled={saving}>{t('companyApplicants.reviewAi')}</Button><span className="text-xs tabular-nums text-[#1C221E]/70">{quota?.plan === 'pro' ? t('companyWorkspace.proPlan') : t('companyWorkspace.quota', { count: quota?.free_ai_uses_remaining ?? 0 })}</span></div><div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><IconBadge icon={MessageSquareText} tone="bronze" /><h3 className="font-semibold text-[#2B362E]">{t('companyApplicants.questions')}</h3></div>{selected.interview_questions?.length > 0 && <Button variant="secondary" onClick={copyQuestions}>{t('companyApplicants.copy')}</Button>}</div>{selected.interview_questions?.length ? <ol className="list-inside list-decimal space-y-2 text-sm text-[#1C221E]">{selected.interview_questions.map((question, index) => <li key={index} dir="auto">{question}</li>)}</ol> : <p className="text-sm text-[#1C221E]/70">{t('companyApplicants.noReport')}</p>}</div>
      <form className="space-y-4 border-t border-[#E5E2D9] pt-6" onSubmit={save}><h3 className="font-semibold text-[#2B362E]">{t('companyApplicants.decision')}</h3><div><label className="mb-2 block text-sm font-medium text-[#2B362E]" htmlFor="candidate-status">{t('common.status')}</label><select id="candidate-status" className="control-input" value={decision} onChange={(event) => setDecision(event.target.value)}>{statuses.map((status) => <option key={status} value={status}>{t(`companyApplicants.status.${status}`)}</option>)}</select>{fieldErrors.status && <p className="mt-1 text-xs text-[#B91C1C]">{fieldErrors.status}</p>}</div>{decision === 'Interview Scheduled' && <><FormField label={t('companyApplicants.interviewDate')} type="datetime-local" value={interviewDate} onChange={(event) => setInterviewDate(event.target.value)} error={fieldErrors.interview_date} required /><FormField label={t('companyApplicants.interviewLink')} type="url" value={interviewLink} onChange={(event) => setInterviewLink(event.target.value)} error={fieldErrors.interview_link} /></>}<FormField as="textarea" inputClassName="h-24 py-3" label={t('companyApplicants.notes')} value={notes} onChange={(event) => setNotes(event.target.value)} error={fieldErrors.company_notes} /><Button type="submit" loading={saving}>{t('common.save')}</Button></form>
    </section></ModalShell>}</AnimatePresence>
  </main>;
}
