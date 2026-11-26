import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Check, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message, kind = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, message, kind }].slice(-3));
    window.setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);

  useEffect(() => {
    const handleQuota = (event) => {
      const hasPlans = event.detail?.plans?.length > 0;
      notify(`${t('quota.title')}. ${hasPlans ? t('quota.body') : t('quota.plansAvailable')}`, 'error');
    };
    window.addEventListener('careerhub:quota-exceeded', handleQuota);
    return () => window.removeEventListener('careerhub:quota-exceeded', handleQuota);
  }, [notify, t]);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed end-4 top-20 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3" aria-live="polite" aria-relevant="additions">
        <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div key={toast.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="flex items-start gap-3 rounded-xl border border-[#E5E2D9] bg-white p-4 shadow-sm" role={toast.kind === 'error' ? 'alert' : 'status'}>
            {toast.kind === 'error'
              ? <AlertCircle className="mt-1 h-4 w-4 shrink-0 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" />
              : <Check className="mt-1 h-4 w-4 shrink-0 text-[#2B362E]" strokeWidth={1.75} aria-hidden="true" />}
            <p className="min-w-0 flex-1 text-sm text-[#1C221E]">{toast.message}</p>
            <button type="button" className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#2B362E] transition-colors duration-150 hover:bg-[#FAF9F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2" onClick={() => dismiss(toast.id)} aria-label={t('toast.dismiss')}>
              <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </motion.div>
        ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
