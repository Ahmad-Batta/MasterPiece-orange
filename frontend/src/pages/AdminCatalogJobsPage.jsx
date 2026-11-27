import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Archive, BookOpen, BriefcaseBusiness, Check, CircleAlert, Edit3, LoaderCircle, Plus, RefreshCw, Search, Tags, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import ModalShell from '../components/ModalShell';
import PaginationBar from '../components/PaginationBar';
import { getApiData, getApiItems } from '../utils/apiResponse';
import { getValidationErrors } from '../utils/validationErrors';

const inputClass = 'h-10 w-full rounded-lg border border-[#E5E2DC] bg-white px-4 text-sm text-[#1C221E] placeholder:text-[#7A827C] transition-colors duration-150 focus:border-[#A37E5E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]';
const actionClass = 'inline-flex h-9 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#E5E2DC] bg-white px-3 text-xs font-medium text-[#2B362E] transition-colors duration-150 hover:bg-[#FAF9F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function StatusPill({ status, t }) {
  const tones = {
    active: 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]',
    closed: 'border-[#E6D7C8] bg-[#F5EFEA] text-[#8E6B4D]',
  };
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${tones[status] || 'border-[#E5E2DC] bg-[#FAF9F5] text-[#4A544D]'}`}>{t(`admin.catalog.status.${status}`)}</span>;
}

function LoadingRows() {
  return <div className="space-y-3" aria-hidden="true">{[0, 1, 2].map((item) => <div key={item} className="animate-pulse rounded-xl border border-[#E5E2DC] bg-white p-6"><div className="flex flex-wrap items-center gap-4"><div className="h-10 w-10 rounded-lg bg-[#E5E2DC]/60" /><div className="min-w-48 flex-1 space-y-2"><div className="h-3 w-1/3 rounded-lg bg-[#E5E2DC]/60" /><div className="h-3 w-2/3 rounded-lg bg-[#E5E2DC]/60" /></div><div className="h-6 w-24 rounded-full bg-[#E5E2DC]/60" /><div className="h-9 w-24 rounded-lg bg-[#E5E2DC]/60" /></div></div>)}</div>;
}

function CategoryModal({ mode, category, isSaving, errors, onClose, onSubmit, t }) {
  const [name, setName] = useState(category?.category_name || '');
  useEffect(() => setName(category?.category_name || ''), [category]);

  return (
    <ModalShell className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B362E]/45 p-4" onClose={onClose}>
      <motion.section role="dialog" aria-modal="true" aria-labelledby="category-modal-title" className="w-full max-w-md rounded-xl border border-[#E5E2DC] bg-white p-6 shadow-sm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.16 }}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><p className="text-xs font-semibold tracking-wide text-[#A37E5E]">{t('admin.catalog.categories.eyebrow')}</p><h2 id="category-modal-title" className="mt-1 text-lg font-semibold text-[#1C221E]">{t(`admin.catalog.categories.${mode}Title`)}</h2></div>
          <button className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[#2B362E] transition-colors hover:bg-[#FAF9F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]" type="button" onClick={onClose} aria-label={t('common.close')}><X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" /></button>
        </div>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(name); }}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#1C221E]" htmlFor="category-name">{t('admin.catalog.categories.nameLabel')}</label>
            <input id="category-name" className={`${inputClass} ${errors.category_name ? 'border-[#B91C1C]' : ''}`} value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required aria-invalid={Boolean(errors.category_name)} aria-describedby={errors.category_name ? 'category-name-error' : undefined} autoFocus />
            {errors.category_name && <p id="category-name-error" className="mt-1 text-xs text-[#B91C1C]">{errors.category_name}</p>}
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button className={actionClass} type="button" onClick={onClose} disabled={isSaving}>{t('common.cancel')}</button>
            <button className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#2B362E] px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#1F2822] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={isSaving || !name.trim()}>
              {isSaving && <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} aria-hidden="true" />}{t(`admin.catalog.categories.${mode}Action`)}
            </button>
          </div>
        </form>
      </motion.section>
    </ModalShell>
  );
}

function CatalogEntityModal({ kind, mode, record, categories, companies, onClose, onSubmit, t }) {
  const isStandardJob = kind === 'standardJob';
  const isEditing = mode === 'edit';
  const [values, setValues] = useState(() => ({
    company_id: record?.company_id ?? record?.company?.id ?? '',
    category_id: record?.category_id ?? '',
    title: record?.title ?? '',
    description: record?.description ?? record?.content ?? '',
    location: record?.location ?? '',
    job_type: record?.job_type ?? '',
    required_skills: Array.isArray(record?.required_skills) ? record.required_skills.join(', ') : (record?.required_skills ?? ''),
    status: record?.status ?? 'active',
    salary_min: record?.salary_min ?? '',
    salary_max: record?.salary_max ?? '',
  }));
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const setField = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };
  const submit = async (event) => {
    event.preventDefault();
    const required = isStandardJob && !isEditing ? ['company_id', 'category_id', 'title', 'description', 'location', 'job_type'] : ['category_id', 'title', 'description'];
    const nextErrors = Object.fromEntries(required.filter((field) => !String(values[field]).trim()).map((field) => [field, t('admin.catalog.forms.required')]));
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setIsSaving(true);
    try {
      const result = await onSubmit({
        ...values,
        required_skills: values.required_skills.split(/[,\n]/).map((skill) => skill.trim()).filter(Boolean),
      });
      if (result?.fieldErrors) setErrors(result.fieldErrors);
      else if (result?.ok) onClose();
    } finally {
      setIsSaving(false);
    }
  };
  const input = (name, label, options = {}) => (
    <label className="block text-xs font-medium text-[#1C221E]" htmlFor={`catalog-${name}`}>
      {label}{options.required && <span aria-hidden="true"> *</span>}
      {options.multiline ? (
        <textarea id={`catalog-${name}`} className={`mt-1 block min-h-20 w-full resize-y rounded-lg border bg-white px-4 py-2 text-sm text-[#1C221E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] ${errors[name] ? 'border-[#B91C1C] focus-visible:ring-[#B91C1C]' : 'border-[#E5E2DC] focus:border-[#A37E5E]'}`} value={values[name]} onChange={setField(name)} disabled={isSaving} dir="auto" aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `catalog-${name}-error` : undefined} />
      ) : (
        <input id={`catalog-${name}`} className={`${inputClass} mt-1 ${errors[name] ? 'border-[#B91C1C] focus:border-[#B91C1C] focus-visible:ring-[#B91C1C]' : ''}`} type={options.type || 'text'} value={values[name]} onChange={setField(name)} disabled={isSaving} required={options.required} placeholder={options.placeholder} dir="auto" aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `catalog-${name}-error` : undefined} />
      )}
      {errors[name] && <span id={`catalog-${name}-error`} className="mt-1 block text-xs text-[#B91C1C]">{errors[name]}</span>}
    </label>
  );
  const select = (name, label, options, placeholder) => (
    <label className="block text-xs font-medium text-[#1C221E]" htmlFor={`catalog-${name}`}>
      {label}<span aria-hidden="true"> *</span>
      <select id={`catalog-${name}`} className={`${inputClass} mt-1 ${errors[name] ? 'border-[#B91C1C] focus:border-[#B91C1C] focus-visible:ring-[#B91C1C]' : ''}`} value={values[name]} onChange={setField(name)} disabled={isSaving} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `catalog-${name}-error` : undefined}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      {errors[name] && <span id={`catalog-${name}-error`} className="mt-1 block text-xs text-[#B91C1C]">{errors[name]}</span>}
    </label>
  );

  return (
    <ModalShell className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#1C221E]/45 p-4" onClose={onClose} canClose={!isSaving}>
      <motion.section role="dialog" aria-modal="true" aria-labelledby="catalog-entity-title" className="my-auto w-full max-w-2xl rounded-xl border border-[#E5E2D9] bg-white p-6 shadow-sm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.18 }}>
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-semibold tracking-wide text-[#A37E5E]">{t(`admin.catalog.${isStandardJob ? 'standardJobs' : 'jobs'}.eyebrow`)}</p><h2 id="catalog-entity-title" className="mt-1 text-lg font-semibold text-[#1C221E]">{t(`admin.catalog.${isStandardJob ? 'standardJobs' : 'jobs'}.${mode}Title`)}</h2></div>
          <button className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[#2B362E] transition-colors hover:bg-[#FAF9F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]" type="button" onClick={onClose} disabled={isSaving} aria-label={t('common.close')}><X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" /></button>
        </div>
        <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
          {isStandardJob && select('company_id', t('admin.catalog.forms.company'), companies, t('admin.catalog.forms.selectCompany'))}
          {!isStandardJob && <div className="rounded-lg border border-[#E5E2D9] bg-[#FAF9F5] px-3 py-2 text-xs text-[#1C221E]"><span className="font-medium">{t('admin.catalog.forms.company')}: </span>{record?.company?.name || record?.company_name || t('admin.catalog.jobs.companyUnknown')}<span className="mt-1 block text-[10px] text-[#1C221E]/65">{t('admin.catalog.jobs.companyReadOnly')}</span></div>}
          {select('category_id', t('admin.catalog.forms.category'), categories, t('admin.catalog.forms.selectCategory'))}
          {input('title', t('admin.catalog.forms.title'), { required: true, placeholder: t('admin.catalog.forms.titlePlaceholder') })}
          {input('description', t('admin.catalog.forms.description'), { required: true, multiline: true })}
          <div className="grid gap-3 sm:grid-cols-2">
            {input('location', t('admin.catalog.forms.location'), { required: isStandardJob && !isEditing, placeholder: t('admin.catalog.forms.locationPlaceholder') })}
            {input('job_type', t('admin.catalog.forms.jobType'), { required: isStandardJob && !isEditing, placeholder: t('admin.catalog.forms.jobTypePlaceholder') })}
          </div>
          {input('required_skills', t('admin.catalog.forms.requiredSkills'), { placeholder: t('admin.catalog.forms.skillsPlaceholder') })}
          {!isStandardJob && <>
            <div className="grid gap-3 sm:grid-cols-2">
              {input('salary_min', t('admin.catalog.forms.salaryMin'), { type: 'number' })}
              {input('salary_max', t('admin.catalog.forms.salaryMax'), { type: 'number' })}
            </div>
            <label className="block text-xs font-medium text-[#1C221E]" htmlFor="catalog-status">{t('common.status')}<select id="catalog-status" className={`${inputClass} mt-1`} value={values.status} onChange={setField('status')} disabled={isSaving}><option value="active">{t('admin.catalog.status.active')}</option><option value="closed">{t('admin.catalog.status.closed')}</option></select></label>
          </>}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button className={actionClass} type="button" onClick={onClose} disabled={isSaving}>{t('common.cancel')}</button>
            <button className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#2B362E] px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#1F2822] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={isSaving}>
              {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} aria-hidden="true" /> : <Check className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />}
              {t(`admin.catalog.${isStandardJob ? 'standardJobs' : 'jobs'}.${mode}Action`)}
            </button>
          </div>
        </form>
      </motion.section>
    </ModalShell>
  );
}

function StandardJobsList({ jobs, onEdit, onDelete, onCreate, page, lastPage, onPageChange, t }) {
  if (jobs.length === 0) {
    return <div className="flex flex-col items-center gap-4 rounded-xl border border-[#E5E2DC] bg-[#FAF9F5] p-8 text-center"><BriefcaseBusiness className="h-6 w-6 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" /><h2 className="text-sm font-semibold text-[#2B362E]">{t('admin.catalog.standardJobs.emptyTitle')}</h2><p className="max-w-prose text-xs leading-relaxed text-[#4A544D]">{t('admin.catalog.standardJobs.emptyBody')}</p><button className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#2B362E] px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#1F2822] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2" type="button" onClick={onCreate}><Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('admin.catalog.standardJobs.add')}</button></div>;
  }
  return <div className="space-y-3">{jobs.map((job) => <article key={job.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E5E2DC] bg-white p-6"><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-[#1C221E]" dir="auto">{job.title}</h2><p className="mt-1 text-xs text-[#4A544D]" dir="auto">{job.company || t('admin.catalog.jobs.companyUnknown')} · {job.category || t('admin.catalog.jobs.categoryUnknown')} · {job.location || t('admin.catalog.jobs.locationUnknown')} · {job.job_type || t('admin.catalog.jobs.typeUnknown')}</p><p className="mt-1 text-[10px] text-[#7A827C]">#{job.id}</p></div><div className="flex items-center gap-2"><button className={actionClass} type="button" onClick={() => onEdit(job)}><Edit3 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('common.edit')}</button><button className={actionClass} type="button" onClick={() => onDelete(job)}><Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('common.delete')}</button></div></article>)}<PaginationBar page={page} lastPage={lastPage} onChange={onPageChange} labels={{ page: (current, total) => t('admin.catalog.page', { current, total }), previous: t('admin.catalog.previous'), next: t('admin.catalog.next'), previousPage: t('admin.catalog.previousPage'), nextPage: t('admin.catalog.nextPage') }} /></div>;
}

export default function AdminCatalogJobsPage() {
  const { t, i18n } = useTranslation();
  const { notify } = useToast();
  const [tab, setTab] = useState('categories');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [jobStatus, setJobStatus] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [standardJobs, setStandardJobs] = useState([]);
  const [jobPosts, setJobPosts] = useState([]);
  const [counts, setCounts] = useState({ categories: null, standardJobs: null, jobs: null });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [modalMode, setModalMode] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryErrors, setCategoryErrors] = useState({});
  const [busyJobId, setBusyJobId] = useState(null);
  const [entityModal, setEntityModal] = useState(null);
  const [isSavingEntity, setIsSavingEntity] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(1), [tab, query, jobStatus, categoryFilter]);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/admin/categories', { params: { per_page: 100 }, signal: controller.signal })
      .then(({ data }) => {
        const payload = data?.data ?? {};
        setCategoryOptions(getApiItems(payload));
        setCounts((current) => ({ ...current, categories: Number(payload.pagination?.total ?? getApiItems(payload).length) }));
      })
      .catch((error) => { if (error.code !== 'ERR_CANCELED') setCategoryOptions([]); });
    api.get('/admin/users', { params: { role: 'company', per_page: 100 }, signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setCompanies(getApiItems(data?.data ?? {}).map((company) => ({ id: company.company_profile?.id ?? company.id, label: company.company_profile?.company_name || company.name })));
      })
      .catch((error) => { if (error.code !== 'ERR_CANCELED') setCompanies([]); });
    api.get('/admin/jobs', { params: { per_page: 1 }, signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setCounts((current) => ({ ...current, standardJobs: Number(data?.data?.pagination?.total ?? 0) }));
      })
      .catch(() => {});
    api.get('/admin/job-posts', { params: { per_page: 1 }, signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setCounts((current) => ({ ...current, jobs: Number(data?.data?.pagination?.total ?? 0) }));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [loadAttempt]);

  const loadActiveList = useCallback(async (signal) => {
    setIsLoading(true);
    setLoadError(false);
    const params = { per_page: 100, page };
    let endpoint;
    if (tab === 'categories') {
      endpoint = '/admin/categories';
      if (query) params.search = query;
    } else if (tab === 'standardJobs') {
      endpoint = '/admin/jobs';
      if (query) params.search = query;
      if (categoryFilter !== 'all') params.category_id = categoryFilter;
    } else {
      endpoint = '/admin/job-posts';
      if (query) params.search = query;
      if (jobStatus !== 'all') params.status = jobStatus;
      if (categoryFilter !== 'all') params.category_id = categoryFilter;
    }
    try {
      if (tab === 'jobs' && query) {
        const firstResponse = await api.get(endpoint, { params: { ...params, page: 1 }, signal });
        const firstPayload = firstResponse.data?.data ?? {};
        const allItems = getApiItems(firstPayload);
        const totalPages = Number(firstPayload.pagination?.last_page ?? 1);
        for (let start = 2; start <= totalPages; start += 10) {
          const pageNumbers = Array.from({ length: Math.min(10, totalPages - start + 1) }, (_, index) => start + index);
          const responses = await Promise.all(pageNumbers.map((currentPage) => api.get(endpoint, { params: { ...params, page: currentPage }, signal })));
          allItems.push(...responses.flatMap((response) => getApiItems(response.data?.data ?? {})));
        }
        const normalizedQuery = query.toLocaleLowerCase();
        const matches = allItems.filter((job) => `${job.title || ''} ${job.company?.name || job.company_name || ''}`.toLocaleLowerCase().includes(normalizedQuery));
        if (signal?.aborted) return;
        setJobPosts(matches);
        setCounts((current) => ({ ...current, jobs: matches.length }));
        setLastPage(Math.max(1, Math.ceil(matches.length / 100)));
        return;
      }
      const { data } = await api.get(endpoint, { params, signal });
      const payload = data?.data ?? {};
      const items = getApiItems(payload);
      if (tab === 'categories') {
        setCategories(items);
        setCounts((current) => ({ ...current, categories: Number(payload.pagination?.total ?? items.length) }));
      } else if (tab === 'standardJobs') {
        setStandardJobs(items);
        setCounts((current) => ({ ...current, standardJobs: Number(payload.pagination?.total ?? items.length) }));
      } else {
        setJobPosts(items);
        setCounts((current) => ({ ...current, jobs: Number(payload.pagination?.total ?? items.length) }));
      }
      setLastPage(Number(payload.pagination?.last_page ?? 1));
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') setLoadError(true);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [tab, query, jobStatus, categoryFilter, page]);

  useEffect(() => {
    const controller = new AbortController();
    loadActiveList(controller.signal);
    return () => controller.abort();
  }, [loadActiveList, loadAttempt]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => setFeedback(''), 4500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const visibleJobs = useMemo(() => {
    if (!query) return jobPosts;
    const pageStart = (page - 1) * 100;
    return jobPosts.slice(pageStart, pageStart + 100);
  }, [jobPosts, page, query]);

  const openCreateModal = () => { setEditingCategory(null); setCategoryErrors({}); setModalMode('create'); };
  const openEditModal = (category) => { setEditingCategory(category); setCategoryErrors({}); setModalMode('edit'); };
  const closeModal = () => { if (!isSavingCategory) setModalMode(null); };
  const openEntityModal = (kind, mode, record = null) => setEntityModal({ kind, mode, record });

  const saveCategory = async (name) => {
    setIsSavingCategory(true);
    setCategoryErrors({});
    try {
      const response = modalMode === 'edit'
        ? await api.patch(`/admin/categories/${editingCategory.id}`, { category_name: name.trim() })
        : await api.post('/admin/categories', { category_name: name.trim() });
      const saved = getApiData(response);
      setModalMode(null);
      const message = t(modalMode === 'edit' ? 'admin.catalog.categories.updated' : 'admin.catalog.categories.created');
      setFeedback(message);
      notify(message);
      setSearch('');
      setPage(1);
      setLoadAttempt((attempt) => attempt + 1);
      if (saved.id && !categoryOptions.some((item) => String(item.id) === String(saved.id))) setCategoryOptions((current) => [...current, saved].sort((a, b) => a.category_name.localeCompare(b.category_name)));
    } catch (error) {
      const fieldErrors = getValidationErrors(error, { fallbackMessage: t('admin.catalog.categories.validationError') });
      if (fieldErrors) {
        setCategoryErrors({ category_name: fieldErrors.category_name || t('admin.catalog.categories.validationError') });
      } else {
        notify(t('admin.catalog.actionError'), 'error');
      }
    } finally {
      setIsSavingCategory(false);
    }
  };

  const deleteCategory = async (category) => {
    if (!window.confirm(t('admin.catalog.categories.deleteConfirm', { name: category.category_name }))) return;
    try {
      await api.delete(`/admin/categories/${category.id}`);
      setCategories((current) => current.filter((item) => String(item.id) !== String(category.id)));
      setCategoryOptions((current) => current.filter((item) => String(item.id) !== String(category.id)));
      setCounts((current) => ({ ...current, categories: Math.max(0, (current.categories ?? 1) - 1) }));
      const message = t('admin.catalog.categories.deleted');
      setFeedback(message);
      notify(message);
    } catch (error) {
      const message = error.response?.status === 409 ? t('admin.catalog.categories.linkedDeleteError') : t('admin.catalog.actionError');
      notify(message, 'error');
    }
  };

  const saveEntity = async (values) => {
    const { kind, mode, record } = entityModal;
    const isStandardJob = kind === 'standardJob';
    const endpoint = isStandardJob ? '/admin/jobs' : '/admin/job-posts';
    const payload = isStandardJob
      ? { company_id: Number(values.company_id), category_id: Number(values.category_id), title: values.title.trim(), description: values.description.trim(), location: values.location.trim(), job_type: values.job_type.trim(), required_skills: values.required_skills }
      : { category_id: Number(values.category_id), title: values.title.trim(), description: values.description.trim(), location: values.location.trim() || null, job_type: values.job_type.trim() || undefined, required_skills: values.required_skills, status: values.status, salary_min: values.salary_min === '' ? null : Number(values.salary_min), salary_max: values.salary_max === '' ? null : Number(values.salary_max) };

    setIsSavingEntity(true);
    try {
      const response = mode === 'create'
        ? await api.post(endpoint, payload)
        : await api.patch(`${endpoint}/${record.id}`, payload);
      const saved = getApiData(response);
      const collectionSetter = isStandardJob ? setStandardJobs : setJobPosts;
      collectionSetter((current) => mode === 'create'
        ? [saved, ...current.filter((item) => String(item.id) !== String(saved.id))]
        : current.map((item) => String(item.id) === String(record.id) ? { ...item, ...saved } : item));
      const message = t(`admin.catalog.${isStandardJob ? 'standardJobs' : 'jobs'}.${mode === 'create' ? 'created' : 'updated'}`);
      setFeedback(message);
      notify(message);
      setPage(1);
      setLoadAttempt((attempt) => attempt + 1);
      return { ok: true };
    } catch (error) {
      const fieldErrors = getValidationErrors(error, { normalizeField: (field) => field.startsWith('required_skills.') ? 'required_skills' : field, fallbackMessage: t('admin.catalog.forms.validationError') });
      if (fieldErrors) return { fieldErrors };
      notify(t('admin.catalog.actionError'), 'error');
      return { ok: false };
    } finally {
      setIsSavingEntity(false);
    }
  };

  const deleteStandardJob = async (job) => {
    if (!window.confirm(t('admin.catalog.standardJobs.deleteConfirm', { title: job.title }))) return;
    try {
      await api.delete(`/admin/jobs/${job.id}`);
      setStandardJobs((current) => current.filter((item) => String(item.id) !== String(job.id)));
      setCounts((current) => ({ ...current, standardJobs: Math.max(0, (current.standardJobs ?? 1) - 1) }));
      const message = t('admin.catalog.standardJobs.deleted');
      setFeedback(message);
      notify(message);
    } catch (error) {
      const message = error.response?.status === 409 ? t('admin.catalog.standardJobs.linkedDeleteError') : t('admin.catalog.actionError');
      notify(message, 'error');
    }
  };

  const toggleJobStatus = async (job) => {
    const nextStatus = job.status === 'active' ? 'closed' : 'active';
    setBusyJobId(job.id);
    try {
      const { data } = await api.patch(`/admin/job-posts/${job.id}`, { status: nextStatus });
      const updated = data?.data ?? {};
      setJobPosts((current) => current.flatMap((item) => {
        if (String(item.id) !== String(job.id)) return [item];
        if (jobStatus !== 'all' && nextStatus !== jobStatus) return [];
        return [{ ...item, ...updated, status: updated.status || nextStatus }];
      }));
      if (jobStatus !== 'all' && nextStatus !== jobStatus) setCounts((current) => ({ ...current, jobs: Math.max(0, (current.jobs ?? 1) - 1) }));
      const message = t(nextStatus === 'active' ? 'admin.catalog.jobs.activated' : 'admin.catalog.jobs.closed');
      setFeedback(message);
      notify(message);
    } catch {
      notify(t('admin.catalog.actionError'), 'error');
    } finally {
      setBusyJobId(null);
    }
  };

  const removeJob = async (job) => {
    if (!window.confirm(t('admin.catalog.jobs.deleteConfirm', { title: job.title }))) return;
    setBusyJobId(job.id);
    try {
      const { data } = await api.delete(`/admin/job-posts/${job.id}`);
      const result = data?.data ?? {};
      if (result.closed && jobStatus !== 'active') {
        setJobPosts((current) => current.map((item) => String(item.id) === String(job.id) ? { ...item, status: 'closed' } : item));
      } else if (result.closed) {
        setJobPosts((current) => current.filter((item) => String(item.id) !== String(job.id)));
        setCounts((current) => ({ ...current, jobs: Math.max(0, (current.jobs ?? 1) - 1) }));
      } else {
        setJobPosts((current) => current.filter((item) => String(item.id) !== String(job.id)));
        setCounts((current) => ({ ...current, jobs: Math.max(0, (current.jobs ?? 1) - 1) }));
      }
      const message = t(result.closed ? 'admin.catalog.jobs.removedClosed' : 'admin.catalog.jobs.removed');
      setFeedback(message);
      notify(message);
    } catch {
      notify(t('admin.catalog.actionError'), 'error');
    } finally {
      setBusyJobId(null);
    }
  };

  const formatCount = (value) => value == null ? '—' : new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-JO' : 'en-US').format(value);

  return (
    <section className="space-y-6" aria-labelledby="admin-catalog-title">
      <header className="rounded-xl border border-[#E5E2DC] bg-white p-6 shadow-sm">
        <p className="mb-2 text-xs font-semibold tracking-wide text-[#A37E5E]">{t('admin.catalog.eyebrow')}</p>
        <h1 id="admin-catalog-title" className="text-xl font-semibold text-[#1C221E] sm:text-2xl">{t('admin.catalog.title')}</h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-[#4A544D]">{t('admin.catalog.subtitle')}</p>
      </header>

      <AnimatePresence initial={false}>{feedback && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }} className="flex items-center gap-3 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-4 text-sm text-[#15803D]" role="status" aria-live="polite"><Check className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />{feedback}<button className="ms-auto inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]" type="button" onClick={() => setFeedback('')} aria-label={t('common.close')}><X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" /></button></motion.div>}</AnimatePresence>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E5E2DC] bg-[#FAF9F5] p-2" role="tablist" aria-label={t('admin.catalog.tabs.label')}>
        {['categories', 'standardJobs', 'jobs'].map((target) => <button key={target} type="button" role="tab" aria-selected={tab === target} aria-controls="admin-catalog-panel" onClick={() => setTab(target)} className={`inline-flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-3 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 sm:px-4 ${tab === target ? 'bg-[#2B362E] text-white' : 'text-[#4A544D] hover:bg-white'}`}><span>{t(`admin.catalog.tabs.${target}`)}</span><span className={`tabular-nums rounded-full px-2 py-0.5 text-[10px] ${tab === target ? 'bg-white/15 text-white' : 'bg-[#E5E2DC] text-[#4A544D]'}`}>{formatCount(counts[target])}</span></button>)}
      </div>

      <div className="rounded-xl border border-[#E5E2DC] bg-white p-6 shadow-sm">
        <div className={`grid gap-4 ${tab === 'jobs' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          <label className="block text-xs font-medium text-[#1C221E]" htmlFor="catalog-search">{t('common.search')}<span className="relative mt-1 block"><Search className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-[#7A827C]" strokeWidth={1.75} aria-hidden="true" /><input id="catalog-search" className={`${inputClass} ps-9`} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t(tab === 'categories' ? 'admin.catalog.categories.searchPlaceholder' : 'admin.catalog.jobs.searchPlaceholder')} /></span></label>
          {tab !== 'categories' && <label className="block text-xs font-medium text-[#1C221E]" htmlFor="job-category-filter">{t('admin.catalog.jobs.categoryFilter')}<select id="job-category-filter" className={`${inputClass} mt-1`} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">{t('admin.catalog.jobs.allCategories')}</option>{categoryOptions.map((item) => <option key={item.id} value={item.id}>{item.category_name}</option>)}</select></label>}
          {tab === 'jobs' && <>
            <label className="block text-xs font-medium text-[#1C221E]" htmlFor="job-status-filter">{t('admin.catalog.jobs.statusFilter')}<select id="job-status-filter" className={`${inputClass} mt-1`} value={jobStatus} onChange={(event) => setJobStatus(event.target.value)}>{['all', 'active', 'closed'].map((value) => <option key={value} value={value}>{t(`admin.catalog.jobs.statusOptions.${value}`)}</option>)}</select></label>
          </>}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[#4A544D]">{t(tab === 'categories' ? 'admin.catalog.categories.countLabel' : tab === 'standardJobs' ? 'admin.catalog.standardJobs.countLabel' : 'admin.catalog.jobs.countLabel', { count: formatCount(counts[tab]) })}</p>
          {tab === 'categories' && <button className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#2B362E] px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#1F2822] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2" type="button" onClick={openCreateModal}><Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('admin.catalog.categories.add')}</button>}
          {tab === 'standardJobs' && <button className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#2B362E] px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#1F2822] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2" type="button" onClick={() => openEntityModal('standardJob', 'create')}><Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('admin.catalog.standardJobs.add')}</button>}
        </div>

        <div id="admin-catalog-panel" role="tabpanel" aria-busy={isLoading} className="mt-5">
          {isLoading ? <LoadingRows /> : loadError ? <div className="flex flex-col items-center gap-3 rounded-xl border border-[#E5E2DC] bg-[#FAF9F5] p-8 text-center" role="alert"><CircleAlert className="h-6 w-6 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" /><p className="text-sm text-[#4A544D]">{t('admin.catalog.loadError')}</p><button className={`${actionClass} bg-[#2B362E] text-white hover:bg-[#1F2822]`} type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>{t('admin.catalog.retry')}</button></div> : tab === 'categories' ? categories.length === 0 ? <div className="flex flex-col items-center gap-3 rounded-xl border border-[#E5E2DC] bg-[#FAF9F5] p-8 text-center"><Tags className="h-6 w-6 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" /><h2 className="text-sm font-semibold text-[#2B362E]">{t('admin.catalog.categories.emptyTitle')}</h2><p className="max-w-prose text-xs leading-relaxed text-[#4A544D]">{t('admin.catalog.categories.emptyBody')}</p><button className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#2B362E] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1F2822] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]" type="button" onClick={openCreateModal}><Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('admin.catalog.categories.add')}</button></div> : <div className="space-y-3">{categories.map((category) => <article key={category.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E5E2DC] bg-white p-6"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FAF9F5] text-[#2B362E]"><BookOpen className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" /></span><div><h2 className="text-sm font-semibold text-[#1C221E]" dir="auto">{category.category_name}</h2><p className="mt-1 text-xs text-[#7A827C]">{t('admin.catalog.categories.identifier', { id: category.id })}</p></div></div><div className="flex items-center gap-2"><button className={actionClass} type="button" onClick={() => openEditModal(category)}>{t('common.edit')}</button><button className={actionClass} type="button" onClick={() => deleteCategory(category)}><Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('common.delete')}</button></div></article>)}<PaginationBar page={page} lastPage={lastPage} onChange={setPage} labels={{ page: (current, total) => t('admin.catalog.page', { current, total }), previous: t('admin.catalog.previous'), next: t('admin.catalog.next'), previousPage: t('admin.catalog.previousPage'), nextPage: t('admin.catalog.nextPage') }} /></div> : tab === 'standardJobs' ? <StandardJobsList jobs={standardJobs} onCreate={() => openEntityModal('standardJob', 'create')} onEdit={(job) => openEntityModal('standardJob', 'edit', job)} onDelete={deleteStandardJob} page={page} lastPage={lastPage} onPageChange={setPage} t={t} /> : visibleJobs.length === 0 ? <div className="flex flex-col items-center gap-3 rounded-xl border border-[#E5E2DC] bg-[#FAF9F5] p-8 text-center"><BriefcaseBusiness className="h-6 w-6 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" /><h2 className="text-sm font-semibold text-[#2B362E]">{t('admin.catalog.jobs.emptyTitle')}</h2><p className="max-w-prose text-xs leading-relaxed text-[#4A544D]">{t('admin.catalog.jobs.emptyBody')}</p><button className={`${actionClass} bg-[#2B362E] text-white hover:bg-[#1F2822]`} type="button" onClick={() => { setSearch(''); setCategoryFilter('all'); setJobStatus('all'); setLoadAttempt((attempt) => attempt + 1); }}><RefreshCw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('admin.catalog.retry')}</button></div> : <><div className="overflow-x-auto rounded-xl border border-[#E5E2DC]"><table className="w-full min-w-[840px] border-collapse text-start"><thead className="bg-[#FAF9F5] text-xs text-[#4A544D]"><tr><th className="px-4 py-3 text-start font-semibold">{t('admin.catalog.jobs.columns.job')}</th><th className="px-4 py-3 text-start font-semibold">{t('admin.catalog.jobs.columns.company')}</th><th className="px-4 py-3 text-start font-semibold">{t('admin.catalog.jobs.columns.category')}</th><th className="px-4 py-3 text-start font-semibold">{t('admin.catalog.jobs.columns.locationType')}</th><th className="px-4 py-3 text-start font-semibold">{t('admin.catalog.jobs.columns.status')}</th><th className="px-4 py-3 text-start font-semibold">{t('common.actions')}</th></tr></thead><tbody className="divide-y divide-[#E5E2DC]">{visibleJobs.map((job) => { const isBusy = String(busyJobId) === String(job.id); return <tr key={job.id}><td className="px-4 py-4"><p className="max-w-56 truncate text-sm font-semibold text-[#1C221E]" dir="auto">{job.title}</p><p className="mt-1 text-xs text-[#7A827C]">#{job.id}</p></td><td className="px-4 py-4 text-sm text-[#4A544D]" dir="auto">{job.company?.name || job.company_name || t('admin.catalog.jobs.companyUnknown')}</td><td className="px-4 py-4"><span className="whitespace-nowrap rounded-full border border-[#E5E2DC] bg-[#FAF9F5] px-2.5 py-1 text-[10px] font-medium text-[#2B362E]">{job.category || t('admin.catalog.jobs.categoryUnknown')}</span></td><td className="px-4 py-4 text-xs text-[#4A544D]" dir="auto"><span className="block">{job.location || t('admin.catalog.jobs.locationUnknown')}</span><span className="mt-1 block text-[#7A827C]">{job.job_type || t('admin.catalog.jobs.typeUnknown')}</span></td><td className="px-4 py-4"><StatusPill status={job.status} t={t} /></td><td className="px-4 py-4"><div className="flex flex-wrap gap-2"><button className={actionClass} type="button" onClick={() => openEntityModal('jobPost', 'edit', job)} disabled={isBusy}><Edit3 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('common.edit')}</button><button className={actionClass} type="button" onClick={() => toggleJobStatus(job)} disabled={isBusy}>{isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} aria-hidden="true" /> : <Archive className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />}{t(job.status === 'active' ? 'admin.catalog.jobs.closeAction' : 'admin.catalog.jobs.openAction')}</button><button className={actionClass} type="button" onClick={() => removeJob(job)} disabled={isBusy}><Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('common.delete')}</button></div></td></tr>; })}</tbody></table></div><div className="mt-4"><PaginationBar page={page} lastPage={lastPage} onChange={setPage} labels={{ page: (current, total) => t('admin.catalog.page', { current, total }), previous: t('admin.catalog.previous'), next: t('admin.catalog.next'), previousPage: t('admin.catalog.previousPage'), nextPage: t('admin.catalog.nextPage') }} /></div></>}
        </div>
      </div>

      <AnimatePresence>{modalMode && <CategoryModal mode={modalMode} category={editingCategory} isSaving={isSavingCategory} errors={categoryErrors} onClose={closeModal} onSubmit={saveCategory} t={t} />}</AnimatePresence>
      <AnimatePresence>{entityModal && <CatalogEntityModal key={`${entityModal.kind}-${entityModal.mode}-${entityModal.record?.id || 'new'}`} kind={entityModal.kind} mode={entityModal.mode} record={entityModal.record} categories={categoryOptions.map((item) => ({ id: item.category_id ?? item.id, label: item.category_name }))} companies={companies} onClose={() => { if (!isSavingEntity) setEntityModal(null); }} onSubmit={saveEntity} t={t} />}</AnimatePresence>
    </section>
  );
}
