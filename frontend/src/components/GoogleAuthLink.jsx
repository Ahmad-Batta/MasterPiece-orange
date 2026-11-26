import { Globe2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';

function googleRedirectUrl(role) {
  const configuredApi = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const apiOrigin = configuredApi.replace(/\/api\/?$/, '').replace(/\/$/, '');
  return `${apiOrigin}/api/auth/google/redirect?role=${encodeURIComponent(role)}`;
}

export default function GoogleAuthLink({ role = 'seeker' }) {
  const { t } = useTranslation();
  return (
    <motion.a className="button-secondary w-full" href={googleRedirectUrl(role)} whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
      <Globe2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      {t('auth.google')}
    </motion.a>
  );
}
