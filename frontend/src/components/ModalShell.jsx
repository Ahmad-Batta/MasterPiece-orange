import { motion } from 'motion/react';

export default function ModalShell({ children, className, onClose, canClose = true }) {
  return (
    <motion.div
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
