import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BadgeCheck, Building2, Check, CircleAlert, LoaderCircle, Pencil, Plus, RefreshCw, Search, ShieldCheck, UserRound, UsersRound, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ModalShell from '../components/ModalShell';
import PaginationBar from '../components/PaginationBar';
import { getApiData, getApiItems } from '../utils/apiResponse';
import { getValidationErrors } from '../utils/validationErrors';

const fieldClass = 'h-10 w-full rounded-lg border border-[#E5E2DC] bg-white px-4 text-sm text-[#1C221E] transition-colors duration-150 placeholder:text-[#7A827C] focus:border-[#A37E5E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]';
const compactButton = 'inline-flex h-9 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#E5E2DC] bg-white px-3 text-xs font-medium text-[#2B362E] transition-colors duration-150 hover:bg-[#FAF9F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function SkeletonRows() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="animate-pulse rounded-xl border border-[#E5E2DC] bg-white p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-[#E5E2DC]/60" />
            <div className="min-w-48 flex-1 space-y-2"><div className="h-3 w-1/3 rounded-lg bg-[#E5E2DC]/60" /><div className="h-3 w-2/3 rounded-lg bg-[#E5E2DC]/60" /></div>
            <div className="h-6 w-24 rounded-full bg-[#E5E2DC]/60" />
            <div className="h-9 w-28 rounded-lg bg-[#E5E2DC]/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusPill({ tone, children }) {
  const palette = {
    success: 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]',
    warning: 'border-[#E6D7C8] bg-[#F5EFEA] text-[#8E6B4D]',
    error: 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]',
    neutral: 'border-[#E5E2DC] bg-[#FAF9F5] text-[#4A544D]',
  };
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${palette[tone]}`}>{children}</span>;
}

function AccountModal({ mode, account, defaultRole, ownAccount, onClose, onSubmit, t }) {
  const isEditing = mode === 'edit';
  const initialValues = {
    role: account?.role || defaultRole || 'seeker',
    name: account?.company_name || account?.name || '',
    email: account?.email || '',
    password: '',
    industry: account?.industry || account?.company_profile?.industry || '',
    description: account?.description || account?.company_profile?.description || '',
    location: account?.location || account?.company_profile?.location || '',
    major: account?.major || '',
    status: account?.is_active === false ? 'inactive' : 'active',
  };
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const updateValue = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!values.name.trim()) nextErrors.name = t('admin.usersCompanies.modal.required');
    if (!values.email.trim()) nextErrors.email = t('admin.usersCompanies.modal.required');
    else if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) nextErrors.email = t('admin.usersCompanies.modal.emailInvalid');
    if (!isEditing && values.password.length < 8) nextErrors.password = t('admin.usersCompanies.modal.passwordLength');
    if (isEditing && values.password && values.password.length < 8) nextErrors.password = t('admin.usersCompanies.modal.passwordLength');
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    try {
      const result = await onSubmit({ ...values, name: values.name.trim(), email: values.email.trim() });
      if (result?.fieldErrors) setErrors(result.fieldErrors);
      else if (result?.ok) onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const field = (name, label, options = {}) => (
    <label className="block text-xs font-medium text-[#1C221E]" htmlFor={`account-${name}`}>
      {label}{options.required && <span aria-hidden="true"> *</span>}
      {options.multiline ? (
        <textarea
          id={`account-${name}`}
          className="mt-1 block min-h-20 w-full resize-y rounded-lg border border-[#E5E2DC] bg-white px-4 py-2 text-sm text-[#1C221E] transition-colors duration-150 focus:border-[#A37E5E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]"
          value={values[name]}
          onChange={updateValue(name)}
          disabled={isSaving}
          dir="auto"
          aria-invalid={Boolean(errors[name])}
          aria-describedby={errors[name] ? `account-${name}-error` : undefined}
        />
      ) : (
        <input
          id={`account-${name}`}
          className={`mt-1 ${fieldClass} ${errors[name] ? 'border-[#B91C1C] focus:border-[#B91C1C] focus-visible:ring-[#B91C1C]' : ''}`}
          type={options.type || 'text'}
          value={values[name]}
          onChange={updateValue(name)}
          disabled={isSaving}
          required={options.required}
          autoComplete={options.autoComplete}
          placeholder={options.placeholder}
          dir="auto"
          aria-invalid={Boolean(errors[name])}
          aria-describedby={errors[name] ? `account-${name}-error` : undefined}
        />
      )}
      {errors[name] && <span id={`account-${name}-error`} className="mt-1 block text-xs text-[#B91C1C]">{errors[name]}</span>}
    </label>
  );

  return (
    <ModalShell className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#1C221E]/45 p-4" onClose={onClose} canClose={!isSaving}>
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-modal-title"
        className="my-auto w-full max-w-lg rounded-xl border border-[#E5E2D9] bg-white p-6 shadow-sm"
        initial={{ opacity: 0, y: 8, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 5, scale: 0.99 }}
        transition={{ duration: 0.18 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="account-modal-title" className="text-base font-semibold text-[#1C221E]">{t(isEditing ? 'admin.usersCompanies.modal.editTitle' : 'admin.usersCompanies.modal.createTitle')}</h2>
            <p className="mt-1 max-w-prose text-xs leading-relaxed text-[#1C221E]/70">{t(isEditing ? 'admin.usersCompanies.modal.editBody' : 'admin.usersCompanies.modal.createBody')}</p>
          </div>
          <button className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#2B362E] transition-colors duration-150 hover:bg-[#FAF9F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={onClose} disabled={isSaving} aria-label={t('common.close')}>
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <form className="mt-5 space-y-3.5" onSubmit={submit} noValidate>
          {!isEditing ? (
            <label className="block text-xs font-medium text-[#1C221E]" htmlFor="account-role">
              {t('admin.usersCompanies.modal.roleLabel')}<span aria-hidden="true"> *</span>
              <select id="account-role" className={`mt-1 ${fieldClass} ${errors.role ? 'border-[#B91C1C]' : ''}`} value={values.role} onChange={updateValue('role')} disabled={isSaving} aria-invalid={Boolean(errors.role)}>
                <option value="seeker">{t('admin.usersCompanies.roles.seeker')}</option>
                <option value="company">{t('admin.usersCompanies.roles.company')}</option>
              </select>
              {errors.role && <span className="mt-1 block text-xs text-[#B91C1C]">{errors.role}</span>}
            </label>
          ) : (
            <div className="rounded-lg border border-[#E5E2D9] bg-[#FAF9F5] px-3 py-2 text-xs text-[#1C221E]">
              <span className="font-medium">{t('admin.usersCompanies.modal.roleLabel')}: </span>{t(`admin.usersCompanies.roles.${values.role}`)}
            </div>
          )}

          {!isEditing && <p className="rounded-lg border border-[#E5E2D9] bg-[#FAF9F5] p-3 text-xs leading-relaxed text-[#1C221E]/75">{t('admin.usersCompanies.modal.adminCreateNote')}</p>}
          {isEditing && <p className="rounded-lg border border-[#E5E2D9] bg-[#FAF9F5] p-3 text-xs leading-relaxed text-[#1C221E]/75">{t('admin.usersCompanies.modal.optionalProfileHint')}</p>}
          {field('name', t('admin.usersCompanies.modal.nameLabel'), { required: true, placeholder: t('admin.usersCompanies.modal.namePlaceholder'), autoComplete: 'name' })}
          {field('email', t('admin.usersCompanies.modal.emailLabel'), { required: true, type: 'email', placeholder: t('admin.usersCompanies.modal.emailPlaceholder'), autoComplete: 'email' })}
          {field('password', t(isEditing ? 'admin.usersCompanies.modal.newPasswordLabel' : 'admin.usersCompanies.modal.passwordLabel'), { required: !isEditing, type: 'password', placeholder: t(isEditing ? 'admin.usersCompanies.modal.newPasswordPlaceholder' : 'admin.usersCompanies.modal.passwordPlaceholder'), autoComplete: isEditing ? 'new-password' : 'new-password' })}

          {values.role === 'company' ? (
            <>
              {field('industry', t('admin.usersCompanies.modal.industryLabel'), { placeholder: t('admin.usersCompanies.modal.industryPlaceholder') })}
              {field('description', t('admin.usersCompanies.modal.descriptionLabel'), { multiline: true })}
              {field('location', t('admin.usersCompanies.modal.locationLabel'), { placeholder: t('admin.usersCompanies.modal.locationPlaceholder') })}
            </>
          ) : values.role === 'seeker' ? (
            <>
              {field('major', t('admin.usersCompanies.modal.majorLabel'), { placeholder: t('admin.usersCompanies.modal.majorPlaceholder') })}
              {field('location', t('admin.usersCompanies.modal.locationLabel'), { placeholder: t('admin.usersCompanies.modal.locationPlaceholder') })}
            </>
          ) : null}

          {isEditing && !ownAccount && (
            <label className="block text-xs font-medium text-[#1C221E]" htmlFor="account-status">
              {t('admin.usersCompanies.modal.statusLabel')}
              <select id="account-status" className={`mt-1 ${fieldClass}`} value={values.status} onChange={updateValue('status')} disabled={isSaving}>
                <option value="active">{t('admin.usersCompanies.accountStatuses.active')}</option>
                <option value="inactive">{t('admin.usersCompanies.accountStatuses.inactive')}</option>
              </select>
            </label>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button className={compactButton} type="button" onClick={onClose} disabled={isSaving}>{t('common.cancel')}</button>
            <button className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#2B362E] px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#1F2822] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={isSaving}>
              {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} aria-hidden="true" /> : <Check className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />}
              {t(isEditing ? 'common.save' : 'admin.usersCompanies.modal.createAction')}
            </button>
          </div>
        </form>
      </motion.section>
    </ModalShell>
  );
}

export default function AdminUsersCompaniesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { notify } = useToast();
  const [tab, setTab] = useState('companies');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [accountStatus, setAccountStatus] = useState('all');
  const [companyStatus, setCompanyStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState({ companies: null, users: null });
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [accountModal, setAccountModal] = useState(null);
  const [query, setQuery] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [tab, query, role, accountStatus, companyStatus]);

  const loadCounts = useCallback(async (signal) => {
    const results = await Promise.allSettled([
      api.get('/admin/users', { params: { role: 'company', per_page: 1 }, signal }),
      api.get('/admin/users', { params: { per_page: 1 }, signal }),
    ]);
    if (signal?.aborted) return;
    setCounts((current) => ({
      companies: results[0].status === 'fulfilled' ? Number(getApiData(results[0].value).pagination?.total ?? 0) : current.companies,
      users: results[1].status === 'fulfilled' ? Number(getApiData(results[1].value).pagination?.total ?? 0) : current.users,
    }));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadCounts(controller.signal);
    return () => controller.abort();
  }, [loadCounts]);

  const loadCompanyList = useCallback(async (signal) => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const companyResponse = await api.get('/admin/users', { params: { role: 'company', search: query || undefined, per_page: 100, page }, signal });
      const companyPayload = getApiData(companyResponse);
      const merged = getApiItems(companyPayload).map((company) => {
        const profile = company.company_profile ?? {};
        return {
          ...company,
          company_name: profile.company_name || company.name,
          verification_status: profile.verification_status || company.verification_status,
          industry: profile.industry || company.industry || '',
          company_profile: profile,
          is_active: company.is_active !== false,
        };
      });
      setCompanies(merged);
      setLastPage(Number(companyPayload.pagination?.last_page ?? 1));
      setCounts((current) => ({ ...current, companies: Number(companyPayload.pagination?.total ?? current.companies ?? merged.length) }));
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') setLoadError(true);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [query, page]);

  const loadUsers = useCallback(async (signal) => {
    setIsLoading(true);
    setLoadError(false);
    const params = { search: query || undefined, per_page: 25, page };
    if (role !== 'all') params.role = role;
    if (accountStatus !== 'all') params.status = accountStatus;
    try {
      const { data } = await api.get('/admin/users', { params, signal });
      const payload = data?.data ?? {};
      setUsers(getApiItems(payload));
      setLastPage(Number(payload.pagination?.last_page ?? 1));
      setCounts((current) => ({ ...current, users: Number(payload.pagination?.total ?? current.users ?? 0) }));
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') setLoadError(true);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [query, page, role, accountStatus]);

  useEffect(() => {
    const controller = new AbortController();
    if (tab === 'companies') loadCompanyList(controller.signal);
    else loadUsers(controller.signal);
    return () => controller.abort();
  }, [tab, loadCompanyList, loadUsers, loadAttempt]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => setFeedback(''), 4500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const filteredCompanies = useMemo(() => companies.filter((company) => {
    if (companyStatus === 'all') return true;
    const status = company.verification_status;
    if (companyStatus === 'pending') return status === 'pending';
    if (companyStatus === 'verified') return status === 'verified';
    if (companyStatus === 'rejected') return status === 'unverified';
    return true;
  }), [companies, companyStatus]);

  const updateCompany = async (company, verificationStatus) => {
    const companyId = company.company_profile?.id ?? company.id;
    setBusyId(companyId);
    try {
      const { data } = await api.patch(`/admin/companies/${companyId}/verify`, { verification_status: verificationStatus });
      const updated = data?.data ?? {};
      setCompanies((current) => current.map((item) => String(item.company_profile?.id ?? item.id) === String(companyId) ? {
        ...item,
        ...updated,
        id: item.id,
        company_name: updated.company_name || item.company_name,
        industry: updated.industry || item.industry,
        verification_status: updated.verification_status || verificationStatus,
        company_profile: { ...item.company_profile, ...updated, id: updated.id ?? companyId, verification_status: updated.verification_status || verificationStatus },
      } : item));
      const message = t(verificationStatus === 'verified' ? 'admin.usersCompanies.approved' : 'admin.usersCompanies.rejected');
      setFeedback(message);
      notify(message);
      loadCounts();
    } catch {
      notify(t('admin.usersCompanies.actionError'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const updateAccountStatus = async (account, nextStatus) => {
    setBusyId(account.id);
    try {
      const { data } = await api.patch(`/admin/users/${account.id}`, { role: account.role, status: nextStatus });
      const updated = data?.data ?? {};
      const active = updated.is_active ?? nextStatus === 'active';
      const updater = (items) => items.map((item) => String(item.id) === String(account.id) && item.role === account.role ? { ...item, ...updated, is_active: active } : item);
      setUsers(updater);
      setCompanies(updater);
      const message = t(active ? 'admin.usersCompanies.activated' : 'admin.usersCompanies.suspended');
      setFeedback(message);
      notify(message);
      loadCounts();
    } catch {
      notify(t('admin.usersCompanies.actionError'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const saveAccount = async (values) => {
    const isEditing = accountModal?.mode === 'edit';
    const role = isEditing ? accountModal.account.role : values.role;
    const payload = { role, name: values.name, email: values.email };
    if (values.password) payload.password = values.password;
    if (isEditing) {
      if (!accountModal.ownAccount) payload.status = values.status;
      if (role === 'company') {
        for (const fieldName of ['industry', 'description', 'location']) {
          if (values[fieldName].trim()) payload[fieldName] = values[fieldName].trim();
        }
      }
      if (role === 'seeker') {
        for (const fieldName of ['major', 'location']) {
          if (values[fieldName].trim()) payload[fieldName] = values[fieldName].trim();
        }
      }
    } else {
      payload.password = values.password;
      if (role === 'company') {
        for (const fieldName of ['industry', 'description', 'location']) {
          if (values[fieldName].trim()) payload[fieldName] = values[fieldName].trim();
        }
      }
      if (role === 'seeker') {
        for (const fieldName of ['major', 'location']) {
          if (values[fieldName].trim()) payload[fieldName] = values[fieldName].trim();
        }
      }
    }

    try {
      const accountId = role === 'company' ? accountModal?.account?.company_profile?.id ?? accountModal?.account?.id : accountModal?.account?.id;
      const response = isEditing
        ? await api.patch(`/admin/users/${accountId}`, payload)
        : await api.post('/admin/users', payload);
      const saved = getApiData(response);
      if (isEditing) {
        const active = saved.is_active ?? values.status === 'active';
        const applyUpdate = (items) => items.map((item) => String(item.id) === String(accountId) && item.role === role ? {
          ...item,
          ...saved,
          id: item.id,
          role,
          name: values.name,
          email: values.email,
          is_active: accountModal.ownAccount ? item.is_active : active,
          ...(role === 'company' ? {
            company_name: values.name,
            industry: values.industry,
            company_profile: { ...item.company_profile, ...saved, id: accountId, company_name: values.name, industry: values.industry, description: values.description, location: values.location },
          } : { major: values.major, location: values.location }),
        } : item);
        setUsers(applyUpdate);
        setCompanies(applyUpdate);
      } else {
        setTab(role === 'company' ? 'companies' : 'users');
        setRole(role === 'company' ? 'all' : role);
        setCompanyStatus('all');
        setAccountStatus('all');
        setSearch('');
        setQuery('');
        setPage(1);
      }
      const key = isEditing ? 'updated' : 'created';
      const message = t(`admin.usersCompanies.modal.${key}`);
      setFeedback(message);
      notify(message);
      loadCounts();
      if (!isEditing) setLoadAttempt((attempt) => attempt + 1);
      return { ok: true };
    } catch (error) {
      const fieldErrors = getValidationErrors(error, { fallbackMessage: t('admin.usersCompanies.modal.validationError') });
      if (fieldErrors) return { fieldErrors };
      notify(t('admin.usersCompanies.actionError'), 'error');
      return { ok: false };
    }
  };

  const openCreateModal = () => setAccountModal({ mode: 'create', defaultRole: tab === 'companies' ? 'company' : 'seeker' });
  const openEditModal = (account) => setAccountModal({ mode: 'edit', account, ownAccount: isSelf(account) });

  const isSelf = (account) => account.role === 'admin' && String(account.id) === String(user?.id);
  const activeList = tab === 'companies' ? filteredCompanies : users;
  const tabButton = (target, Icon, count) => (
    <button
      type="button"
      onClick={() => setTab(target)}
      role="tab"
      aria-selected={tab === target}
      id={`admin-users-tab-${target}`}
      aria-controls="admin-users-panel"
      className={`inline-flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-3 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 sm:px-4 ${tab === target ? 'bg-[#2B362E] text-white' : 'text-[#4A544D] hover:bg-white'}`}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      {t(`admin.usersCompanies.tabs.${target}`)}
      <span className={`tabular-nums rounded-full px-2 py-0.5 text-[10px] ${tab === target ? 'bg-white/15 text-white' : 'bg-[#E5E2DC] text-[#4A544D]'}`}>{count == null ? '—' : count}</span>
    </button>
  );

  return (
    <section className="space-y-6" aria-labelledby="admin-users-title">
      <header className="flex flex-col gap-4 rounded-xl border border-[#E5E2DC] bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-[#A37E5E]">{t('admin.usersCompanies.eyebrow')}</p>
          <h1 id="admin-users-title" className="text-xl font-semibold text-[#1C221E] sm:text-2xl">{t('admin.usersCompanies.title')}</h1>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-[#4A544D]">{t('admin.usersCompanies.subtitle')}</p>
        </div>
        <button className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 self-start whitespace-nowrap rounded-lg bg-[#2B362E] px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#1F2822] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto" type="button" onClick={openCreateModal}>
          <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('admin.usersCompanies.modal.addAccount')}
        </button>
      </header>

      <AnimatePresence initial={false}>
        {feedback && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }} className="flex items-center gap-3 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-4 text-sm text-[#15803D]" role="status" aria-live="polite">
            <Check className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />{feedback}
            <button className="ms-auto inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]" type="button" onClick={() => setFeedback('')} aria-label={t('common.close')}><X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E5E2DC] bg-[#FAF9F5] p-1.5" role="tablist" aria-label={t('admin.usersCompanies.tabs.label')}>
        {tabButton('companies', Building2, counts.companies)}
        {tabButton('users', UsersRound, counts.users)}
      </div>

      <div className="rounded-xl border border-[#E5E2DC] bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-[#1C221E]" htmlFor="admin-users-search">
            {t('common.search')}
            <span className="relative mt-1 block">
              <Search className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-[#7A827C]" strokeWidth={1.75} aria-hidden="true" />
              <input id="admin-users-search" className={`${fieldClass} ps-9`} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t(tab === 'companies' ? 'admin.usersCompanies.companySearchPlaceholder' : 'admin.usersCompanies.userSearchPlaceholder')} />
            </span>
          </label>
          {tab === 'companies' ? (
            <label className="block text-xs font-medium text-[#1C221E]" htmlFor="company-verification-filter">
              {t('admin.usersCompanies.verificationFilter')}
              <select id="company-verification-filter" className={`${fieldClass} mt-1`} value={companyStatus} onChange={(event) => setCompanyStatus(event.target.value)}>
                {['all', 'pending', 'verified', 'rejected'].map((value) => <option key={value} value={value}>{t(`admin.usersCompanies.companyStatuses.${value}`)}</option>)}
              </select>
            </label>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-[#1C221E]" htmlFor="user-role-filter">{t('admin.usersCompanies.roleFilter')}
                <select id="user-role-filter" className={`${fieldClass} mt-1`} value={role} onChange={(event) => setRole(event.target.value)}>
                  {['all', 'seeker', 'company', 'admin'].map((value) => <option key={value} value={value}>{t(`admin.usersCompanies.roles.${value}`)}</option>)}
                </select>
              </label>
              <label className="block text-xs font-medium text-[#1C221E]" htmlFor="user-status-filter">{t('admin.usersCompanies.accountFilter')}
                <select id="user-status-filter" className={`${fieldClass} mt-1`} value={accountStatus} onChange={(event) => setAccountStatus(event.target.value)}>
                  {['all', 'active', 'inactive'].map((value) => <option key={value} value={value}>{t(`admin.usersCompanies.accountStatuses.${value}`)}</option>)}
                </select>
              </label>
            </div>
          )}
        </div>

        <div id="admin-users-panel" role="tabpanel" aria-labelledby={`admin-users-tab-${tab}`} className="mt-6" aria-busy={isLoading}>
          {isLoading ? <SkeletonRows /> : loadError ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-[#E5E2DC] bg-[#FAF9F5] p-8 text-center" role="alert">
              <CircleAlert className="h-6 w-6 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" />
              <p className="text-sm text-[#4A544D]">{t('admin.usersCompanies.loadError')}</p>
              <button className={`${compactButton} bg-[#2B362E] text-white hover:bg-[#1F2822]`} type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>{t('admin.usersCompanies.retry')}</button>
            </div>
          ) : activeList.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-[#E5E2DC] bg-[#FAF9F5] p-8 text-center">
              {tab === 'companies' ? <Building2 className="h-6 w-6 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" /> : <UserRound className="h-6 w-6 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" />}
              <h2 className="text-sm font-semibold text-[#2B362E]">{t('admin.usersCompanies.emptyTitle')}</h2>
              <p className="max-w-prose text-xs leading-relaxed text-[#4A544D]">{t('admin.usersCompanies.emptyBody')}</p>
              <button className={`${compactButton} bg-[#2B362E] text-white hover:bg-[#1F2822]`} type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}><RefreshCw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('admin.usersCompanies.refresh')}</button>
              {(query || companyStatus !== 'all' || role !== 'all' || accountStatus !== 'all') && <button className={compactButton} type="button" onClick={() => { setSearch(''); setCompanyStatus('all'); setRole('all'); setAccountStatus('all'); }}>{t('admin.usersCompanies.clearFilters')}</button>}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-[#E5E2DC]">
                <table className="w-full min-w-[720px] border-collapse text-start">
                  <thead className="bg-[#FAF9F5] text-xs text-[#4A544D]"><tr>
                    <th className="px-4 py-3 font-semibold text-start">{t('admin.usersCompanies.columns.account')}</th>
                    <th className="px-4 py-3 font-semibold text-start">{tab === 'companies' ? t('admin.usersCompanies.columns.focus') : t('admin.usersCompanies.columns.role')}</th>
                    <th className="px-4 py-3 font-semibold text-start">{t(tab === 'companies' ? 'admin.usersCompanies.columns.verification' : 'admin.usersCompanies.columns.status')}</th>
                    <th className="px-4 py-3 font-semibold text-start">{t('common.actions')}</th>
                  </tr></thead>
                  <tbody className="divide-y divide-[#E5E2DC]">
                    {activeList.map((account) => {
                      const isCompany = tab === 'companies';
                      const isPending = account.verification_status === 'pending';
                      const isVerified = account.verification_status === 'verified';
                      const isUnverified = account.verification_status === 'unverified';
                      const ownAccount = isSelf(account);
                      const isBusy = busyId != null && String(busyId) === String(account.id);
                      return (
                        <tr key={`${account.role || 'company'}-${account.id}`} className="align-middle">
                          <td className="px-4 py-4">
                            <p className="text-sm font-semibold text-[#1C221E]" dir="auto">{account.company_name || account.name || t('admin.usersCompanies.unnamed')}</p>
                            <p className="mt-1 text-xs text-[#4A544D]" dir="auto">{account.email}</p>
                          </td>
                          <td className="px-4 py-4 text-xs text-[#4A544D]" dir="auto">{isCompany ? (account.industry || t('admin.usersCompanies.focusUnavailable')) : t(`admin.usersCompanies.roles.${account.role}`)}</td>
                          <td className="px-4 py-4">
                            {isCompany ? <div className="flex flex-wrap gap-2"><StatusPill tone={isPending ? 'warning' : isVerified ? 'success' : 'neutral'}>{t(`admin.usersCompanies.companyStatuses.${isUnverified ? 'rejected' : account.verification_status}`)}</StatusPill>{!account.is_active && <StatusPill tone="error">{t('admin.usersCompanies.accountStatuses.inactive')}</StatusPill>}</div> : <StatusPill tone={account.is_active ? 'success' : 'error'}>{t(`admin.usersCompanies.accountStatuses.${account.is_active ? 'active' : 'inactive'}`)}</StatusPill>}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <button className={compactButton} type="button" onClick={() => openEditModal(account)} disabled={isBusy}>
                                <Pencil className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('common.edit')}
                              </button>
                              {isCompany && <>
                                <button className={`${compactButton} border-[#2B362E] bg-[#2B362E] text-white hover:bg-[#1F2822]`} type="button" onClick={() => updateCompany(account, 'verified')} disabled={isBusy || isVerified}>
                                  {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} aria-hidden="true" /> : <BadgeCheck className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />}{t(isPending ? 'admin.usersCompanies.approve' : 'admin.usersCompanies.verify')}
                                </button>
                                <button className={compactButton} type="button" onClick={() => updateCompany(account, 'unverified')} disabled={isBusy || isUnverified}>
                                  <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('admin.usersCompanies.reject')}
                                </button>
                                <button className={compactButton} type="button" onClick={() => updateAccountStatus(account, account.is_active ? 'inactive' : 'active')} disabled={isBusy}>
                                  {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />}
                                  {t(account.is_active ? 'admin.usersCompanies.suspend' : 'admin.usersCompanies.activate')}
                                </button>
                              </>}
                              {!isCompany && <button className={compactButton} type="button" onClick={() => updateAccountStatus(account, account.is_active ? 'inactive' : 'active')} disabled={isBusy || ownAccount} title={ownAccount ? t('admin.usersCompanies.selfSuspendBlocked') : undefined}>
                                {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />}
                                {t(account.is_active ? 'admin.usersCompanies.suspend' : 'admin.usersCompanies.activate')}
                              </button>}
                            </div>
                            {ownAccount && <p className="mt-2 text-[10px] text-[#7A827C]">{t('admin.usersCompanies.selfSuspendBlocked')}</p>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
                <PaginationBar page={page} lastPage={lastPage} onChange={setPage} disabled={isLoading} labels={{ page: (current, total) => t('admin.usersCompanies.page', { current, total }), previous: t('admin.usersCompanies.previous'), next: t('admin.usersCompanies.next'), previousPage: t('admin.usersCompanies.previousPage'), nextPage: t('admin.usersCompanies.nextPage') }} />
              </div>
            </>
          )}
        </div>
      </div>
      <AnimatePresence>
        {accountModal && <AccountModal key={`${accountModal.mode}-${accountModal.account?.role || accountModal.defaultRole}-${accountModal.account?.id || 'new'}`} mode={accountModal.mode} account={accountModal.account} defaultRole={accountModal.defaultRole} ownAccount={accountModal.ownAccount} onClose={() => setAccountModal(null)} onSubmit={saveAccount} t={t} />}
      </AnimatePresence>
    </section>
  );
}
