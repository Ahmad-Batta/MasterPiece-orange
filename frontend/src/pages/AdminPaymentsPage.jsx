import { useCallback, useEffect, useState } from 'react';
import { CreditCard, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import Button from '../components/Button';
import PaginationBar from '../components/PaginationBar';
import { getApiData, getApiItems } from '../utils/apiResponse';
import { useAdminPreferences } from '../utils/adminPreferences';

const control = 'h-10 w-full rounded-lg border border-[#E5E2D9] bg-white px-4 text-sm text-[#1C221E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]';
const dateText = (value, language) => value ? new Intl.DateTimeFormat(language === 'ar' ? 'ar-JO' : 'en-JO', { dateStyle: 'medium' }).format(new Date(value)) : '—';

export default function AdminPaymentsPage() {
  const { t, i18n } = useTranslation();
  const preferences = useAdminPreferences();
  const [tab, setTab] = useState('history');
  const [status, setStatus] = useState('all');
  const [role, setRole] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState([]);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { const timer = window.setTimeout(() => setQuery(search.trim()), 250); return () => window.clearTimeout(timer); }, [search]);
  useEffect(() => setPage(1), [tab, status, role, query]);
  const load = useCallback(async (signal) => {
    setLoading(true); setError(false);
    try {
      const response = tab === 'history'
        ? await api.get('/admin/payments', { params: { status: status === 'all' ? undefined : status, page, per_page: 20 }, signal })
        : await api.get('/admin/subscriptions', { params: { role: role === 'all' ? undefined : role, search: query || undefined, page, per_page: 20 }, signal });
      if (signal.aborted) return;
      const payload = getApiData(response);
      setItems(getApiItems(payload));
      setLastPage(Number(payload.pagination?.last_page || 1));
      if (tab === 'history') setTotals(payload.totals || []);
    } catch (cause) { if (cause.code !== 'ERR_CANCELED') setError(true); }
    finally { if (!signal.aborted) setLoading(false); }
  }, [tab, status, role, query, page]);
  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, [load, attempt]);
  const pageLabels = { page: (current, total) => t('admin.usersCompanies.page', { current, total }), previous: t('admin.usersCompanies.previous'), next: t('admin.usersCompanies.next'), previousPage: t('admin.usersCompanies.previousPage'), nextPage: t('admin.usersCompanies.nextPage') };
  const number = new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-JO' : 'en-US', { maximumFractionDigits: 2 });
  const padding = preferences.tableDensity === 'compact' ? 'px-4 py-2' : 'px-4 py-4';

  return <section className="space-y-6" aria-labelledby="admin-payments-title">
    <header><h1 id="admin-payments-title" className="text-xl font-semibold text-[#2B362E] sm:text-2xl">{t('admin.payments.title')}</h1><p className="mt-2 text-sm text-[#1C221E]/70">{t('admin.payments.subtitle')}</p></header>
    <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('admin.payments.title')}>{['history', 'subscriptions'].map((key) => <button key={key} role="tab" aria-selected={tab === key} className={`h-10 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] ${tab === key ? 'bg-[#2B362E] text-white' : 'border border-[#E5E2D9] bg-white text-[#2B362E] hover:bg-[#FAF9F5]'}`} type="button" onClick={() => setTab(key)}>{t(`admin.payments.${key}`)}</button>)}</div>
    {tab === 'history' && totals.length > 0 && <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{totals.map((total) => <div key={`${total.currency}-${total.gateway}-${total.mode}`} className="rounded-xl border border-[#E5E2D9] bg-white p-6 shadow-sm"><p className="text-xs text-[#1C221E]/70">{t('admin.payments.revenue')} · {total.currency} · {t(`admin.payments.${total.mode}`)}</p><p className="mt-2 text-2xl font-semibold tabular-nums text-[#2B362E]" dir="ltr">{number.format(Number(total.amount))} {total.currency}</p><p className="mt-1 text-xs text-[#1C221E]/70">{number.format(Number(total.transactions))} {t('admin.payments.transactions')}</p></div>)}</div>}
    <div className="rounded-xl border border-[#E5E2D9] bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap gap-4">{tab === 'history' ? <label className="text-xs font-medium text-[#1C221E]" htmlFor="payment-status">{t('admin.payments.status')}<select id="payment-status" className={`${control} mt-1`} value={status} onChange={(event) => setStatus(event.target.value)}>{['all', 'paid', 'pending', 'failed'].map((key) => <option key={key} value={key}>{t(`admin.payments.${key}`)}</option>)}</select></label> : <><label className="text-xs font-medium text-[#1C221E]" htmlFor="subscription-role">{t('admin.payments.role')}<select id="subscription-role" className={`${control} mt-1`} value={role} onChange={(event) => setRole(event.target.value)}><option value="all">{t('admin.payments.allRoles')}</option>{['seeker', 'company'].map((key) => <option key={key} value={key}>{t(`admin.payments.${key}`)}</option>)}</select></label><label className="min-w-48 flex-1 text-xs font-medium text-[#1C221E]" htmlFor="subscription-search">{t('common.search')}<input id="subscription-search" className={`${control} mt-1`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('admin.payments.search')} /></label></>}</div>
      {loading ? <div className="animate-pulse space-y-4" role="status" aria-label={t('common.loading')}>{[0, 1, 2].map((key) => <div key={key} className="h-12 rounded-lg bg-[#E5E2D9]/60" />)}</div> : error ? <div className="flex flex-col items-center gap-4 p-6 text-center" role="alert"><p>{t('admin.payments.error')}</p><Button onClick={() => setAttempt((value) => value + 1)}><RefreshCw className="h-4 w-4" strokeWidth={1.75} />{t('admin.overview.retry')}</Button></div> : items.length === 0 ? <div className="flex flex-col items-center gap-4 p-8 text-center"><CreditCard className="h-7 w-7 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" /><p className="text-sm text-[#1C221E]/70">{t('admin.payments.empty')}</p><Button onClick={() => { setStatus('all'); setRole('all'); setSearch(''); setAttempt((value) => value + 1); }}>{t('admin.overview.refresh')}</Button></div> : <><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-start text-sm"><thead className="border-b border-[#E5E2D9] text-xs text-[#1C221E]/70"><tr>{(tab === 'history' ? ['name', 'plan', 'amount', 'gateway', 'mode', 'status', 'date'] : ['name', 'role', 'status', 'expires']).map((key) => <th key={key} className="px-4 py-3 text-start font-medium">{t(`admin.payments.${key}`)}</th>)}</tr></thead><tbody className="divide-y divide-[#E5E2D9]">{items.map((item) => <tr key={`${tab}-${item.id}-${item.role || ''}`}>{tab === 'history' ? <><td className={padding} dir="auto">{item.payable?.name || '—'}<span className="block text-xs text-[#1C221E]/60">{t(`admin.payments.${item.payable?.role || 'unknown'}`)}</span></td><td className={padding} dir="auto">{item.plan?.name || '—'}</td><td className={`${padding} tabular-nums`} dir="ltr">{number.format(Number(item.amount))} {item.currency}</td><td className={padding}>{item.gateway}</td><td className={padding}><span className="rounded-full border border-[#E5E2D9] bg-[#FAF9F5] px-2 py-1 text-xs">{t(`admin.payments.${item.mode || 'unknown'}`)}</span></td><td className={padding}>{t(`admin.payments.${item.status}`)}</td><td className={padding}>{dateText(item.paid_at || item.created_at, i18n.language)}</td></> : <><td className={padding} dir="auto">{item.name}<span className="block text-xs text-[#1C221E]/60">{item.email}</span></td><td className={padding}>{t(`admin.payments.${item.role}`)}</td><td className={padding}>{t('admin.payments.subscriptions')}</td><td className={`${padding} tabular-nums`}>{dateText(item.plan_expires_at, i18n.language)}</td></>}</tr>)}</tbody></table></div><PaginationBar page={page} lastPage={lastPage} onChange={setPage} labels={pageLabels} disabled={loading} /></>}
    </div>
  </section>;
}
