import { LoaderCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function Button({ children, loading = false, disabled = false, className = '', variant = 'primary', type = 'button', ...props }) {
  const style = variant === 'secondary' ? 'button-secondary' : 'button-primary';
  return (
    <motion.button type={type} className={`${style} ${className}`} disabled={loading || disabled} whileHover={loading || disabled ? undefined : { y: -1 }} whileTap={loading || disabled ? undefined : { scale: 0.98 }} transition={{ duration: 0.15 }} {...props}>
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} aria-hidden="true" />}
      {children}
    </motion.button>
  );
}
