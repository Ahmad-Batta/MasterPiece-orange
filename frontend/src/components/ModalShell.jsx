import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';

export default function ModalShell({ children, className, onClose, canClose = true }) {
  const root = useRef(null);
  const close = useRef({ onClose, canClose });
  close.current = { onClose, canClose };
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => [...(root.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') || [])].filter((node) => node.getClientRects().length);
    (focusable()[0] || root.current)?.focus();
    const handleKey = (event) => {
      if (event.key === 'Escape' && close.current.canClose) { event.preventDefault(); close.current.onClose?.(); }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (!elements.length) { event.preventDefault(); root.current?.focus(); return; }
      const first = elements[0]; const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !root.current?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !root.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', handleKey); previousFocus?.focus?.(); };
  }, []);
  return (
    <motion.div
      ref={root}
      tabIndex={-1}
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && canClose) onClose?.();
      }}
    >
      {children}
    </motion.div>
  );
}
