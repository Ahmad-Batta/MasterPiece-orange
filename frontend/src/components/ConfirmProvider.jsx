import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import ModalShell from './ModalShell';
import Button from './Button';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const { t } = useTranslation();
  const [message, setMessage] = useState(null);
  const resolver = useRef(null);
  const confirm = useCallback((text) => new Promise((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setMessage(text);
  }), []);
  const finish = (result) => { resolver.current?.(result); resolver.current = null; setMessage(null); };
  return <ConfirmContext.Provider value={confirm}>
    {children}
    <AnimatePresence>{message && <ModalShell className="fixed inset-0 z-[70] flex items-center justify-center bg-[#1C221E]/45 p-4" onClose={() => finish(false)}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="confirmation-title" aria-describedby="confirmation-message" className="w-full max-w-md rounded-xl border border-[#E5E2D9] bg-white p-6 shadow-sm">
        <h2 id="confirmation-title" className="text-base font-semibold text-[#2B362E]">{t('common.confirm')}</h2>
        <p id="confirmation-message" className="mt-4 text-sm leading-7 text-[#1C221E]">{message}</p>
        <div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={() => finish(false)}>{t('common.cancel')}</Button><Button onClick={() => finish(true)}>{t('common.confirm')}</Button></div>
      </section>
    </ModalShell>}</AnimatePresence>
  </ConfirmContext.Provider>;
}

export function useConfirm() { return useContext(ConfirmContext); }
