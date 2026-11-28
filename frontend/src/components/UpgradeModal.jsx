import { useEffect, useState } from 'react';
import { CreditCard, Sparkles, X } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { getApiData, getApiItems } from '../utils/apiResponse';
import Button from './Button';
import ModalShell from './ModalShell';
import PaginationBar from './PaginationBar';

function BillingPanel({ request, onClose }) {
  const { t, i18n } = useTranslation();
  const { role, updateCurrentUser } = useAuth();
  const [plans, setPlans] = useState(request.plans ?? []);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState(false);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [demo, setDemo] = useState(null);
  const [busy, setBusy] = useState(null);
  const [feedback, setFeedback] = useState(request.returnStatus || '');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setPlansLoading(true);
    setPlansError(false);
    api.get('/plans', { params: { role }, signal })
      .then((response) => { if (!signal.aborted) setPlans(getApiItems(getApiData(response))); })
      .catch(() => { if (!signal.aborted) setPlansError(true); })
      .finally(() => { if (!signal.aborted) setPlansLoading(false); });
    return () => controller.abort();
  }, [role, attempt]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setHistoryLoading(true);
    setHistoryError(false);
    api.get('/payments/history', { params: { page }, signal })
      .then((response) => { if (!signal.aborted) setHistory(getApiData(response)); })
      .catch(() => { if (!signal.aborted) setHistoryError(true); })
      .finally(() => { if (!signal.aborted) setHistoryLoading(false); });
    return () => controller.abort();
  }, [page, attempt]);

  function money(amount, currency) {
    return new Intl.NumberFormat(i18n.language, { style: 'currency', currency }).format(Number(amount));
  }

  async function checkout(plan) {
    if (busy) return;
    setBusy(plan.id);
    setError('');
    setFeedback('');
    try {
      const result = getApiData(await api.post('/payments/checkout', { plan_id: plan.id }));
      if (result.gateway === 'demo' && result.payment_id) {
        setDemo({ plan, id: result.payment_id });
        setPage(1);
        setAttempt((value) => value + 1);
      } else if (result.gateway === 'stripe') {
        const url = new URL(result.checkout_url);
        if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('Invalid checkout URL');
        window.location.assign(url.href);
      } else {
        throw new Error('Unknown checkout gateway');
      }
    } catch {
      setError('checkoutError');
    } finally {
      setBusy(null);
    }
  }

  async function refreshAccount() {
    try {
      const response = await api.get('/me');
      updateCurrentUser(getApiData(response).user);
      window.dispatchEvent(new Event('careerhub:billing-updated'));
    } catch {
      setError('refreshError');
    } finally {
      setPage(1);
      setAttempt((value) => value + 1);
    }
  }

  async function confirmDemo() {
    if (busy || !demo) return;
    setBusy('demo');
    setError('');
    try {
      await api.post(`/payments/demo-confirm/${demo.id}`);
      setDemo(null);
      setFeedback('confirmed');
      await refreshAccount();
    } catch {
      setError('confirmError');
    } finally {
      setBusy(null);
    }
  }

  const payments = getApiItems(history);
  const retry = async () => {
    setError('');
    setBusy('refresh');
    await refreshAccount();
    setBusy(null);
  };

  return (
    <ModalShell className="fixed inset-0 z-[80] flex items-center justify-center bg-[#1C221E]/45 p-4"
      onClose={onClose} canClose={!busy}>
      <section role="dialog" aria-modal="true" aria-labelledby="billing-title"
        className="surface-card max-h-[90dvh] w-full max-w-2xl space-y-6 overflow-auto">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 id="billing-title" className="section-title">{t('billing.title')}</h2>
            {request.quota && <p className="mt-2 text-sm leading-relaxed text-[#1C221E]/75">{t('billing.quota')}</p>}
          </div>
          <button type="button" aria-label={t('common.close')} onClick={onClose} disabled={Boolean(busy)}
            className="button-secondary h-10 w-10 shrink-0 px-0">
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </header>
        {feedback && <p className="rounded-lg border border-[#E5E2D9] bg-[#FAF9F5] p-4 text-sm" role="status">{t(`billing.${feedback}`)}</p>}
        {error && <p className="text-sm text-[#B91C1C]" role="alert">{t(`billing.${error}`)}</p>}
        {demo ? (
          <div className="rounded-xl border border-[#E5E2D9] bg-[#FAF9F5] p-6">
            <h3 className="font-semibold text-[#2B362E]">{t('billing.demoTitle')}</h3>
            <p className="mt-2 text-sm leading-relaxed">{t('billing.demoIntro', { plan: demo.plan.name, price: money(demo.plan.price, demo.plan.currency) })}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button loading={busy === 'demo'} onClick={confirmDemo}>{t('billing.confirmDemo')}</Button>
              <Button variant="secondary" disabled={Boolean(busy)} onClick={() => { setDemo(null); setError(''); }}>{t('common.cancel')}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {plansLoading && !plans.length ? <div className="h-32 animate-pulse rounded-xl bg-[#E5E2D9]/60" aria-busy="true" aria-label={t('common.loading')} />
              : !plans.length && <p className="text-sm">{t(plansError ? 'billing.plansError' : 'billing.noPlans')}</p>}
            {plans.map((plan) => (
              <article key={plan.id} className="rounded-xl border border-[#E5E2D9] bg-[#FAF9F5] p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold text-[#2B362E]"><Sparkles className="h-4 w-4 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" /><span dir="auto">{plan.name}</span></h3>
                    <p className="mt-2 text-sm tabular-nums">{t('billing.price', { price: money(plan.price, plan.currency), count: plan.duration_days })}</p>
                  </div>
                  <Button onClick={() => checkout(plan)} loading={busy === plan.id} disabled={Boolean(busy)}>
                    <CreditCard className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('billing.checkout')}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
        <section className="space-y-4 border-t border-[#E5E2D9] pt-4" aria-labelledby="billing-history">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="billing-history" className="font-semibold text-[#2B362E]">{t('billing.history')}</h3>
            <Button variant="secondary" disabled={Boolean(busy)} loading={busy === 'refresh'} onClick={retry}>{t('billing.refresh')}</Button>
          </div>
          {historyLoading ? <div className="h-20 animate-pulse rounded-lg bg-[#E5E2D9]/60" aria-busy="true" aria-label={t('common.loading')} />
            : historyError ? <p role="alert" className="text-sm">{t('billing.historyError')}</p>
              : payments.length ? <ul className="divide-y divide-[#E5E2D9]">
                {payments.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                  <span className="break-words" dir="auto">{item.plan?.name || t('billing.title')}</span>
                  <span className="tabular-nums">{money(item.amount, item.currency)} · {t(`billing.status.${item.status}`)}</span>
                </li>)}
              </ul> : <p className="text-sm">{t('billing.noHistory')}</p>}
          <PaginationBar page={page} lastPage={history?.pagination?.last_page ?? 1} onChange={setPage}
            disabled={historyLoading || Boolean(busy)} labels={{
              page: (current, total) => t('seeker.pagination.page', { current, total }),
              previous: t('seeker.pagination.previous'), previousPage: t('seeker.pagination.previous'),
              next: t('seeker.pagination.next'), nextPage: t('seeker.pagination.next'),
            }} />
        </section>
      </section>
    </ModalShell>
  );
}

export default function UpgradeModal() {
  const { role, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const account = user && ['seeker', 'company'].includes(role) ? `${role}:${user.id}` : null;

  useEffect(() => {
    setRequest((current) => current?.account === account ? current : null);
  }, [account]);

  useEffect(() => {
    if (!account) return undefined;
    const manual = () => setRequest({ account });
    const overQuota = (event) => setRequest((current) => current?.account === account
      ? current : { account, quota: true, plans: event.detail?.plans });
    window.addEventListener('careerhub:open-billing', manual);
    window.addEventListener('careerhub:quota-exceeded', overQuota);
    return () => {
      window.removeEventListener('careerhub:open-billing', manual);
      window.removeEventListener('careerhub:quota-exceeded', overQuota);
    };
  }, [account]);

  useEffect(() => {
    if (!account || !location.state?.billingReturn) return;
    setRequest({ account, returnStatus: location.state.billingReturn });
    navigate(location.pathname + location.search, { replace: true, state: null });
  }, [account, location, navigate]);

  return <AnimatePresence>
    {account && request?.account === account && <BillingPanel key={account} request={request} onClose={() => setRequest(null)} />}
  </AnimatePresence>;
}
