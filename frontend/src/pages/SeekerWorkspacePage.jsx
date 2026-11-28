import { FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import IconBadge from '../components/IconBadge';

export default function SeekerWorkspacePage({ section }) {
  const { t } = useTranslation();

  return (
    <section className="surface-card max-w-2xl space-y-4">
      <IconBadge icon={FileText} />
      <h1 className="section-title">{t(`seeker.navigation.${section}`)}</h1>
      <p className="text-sm leading-relaxed text-[#1C221E]/75">{t(`seeker.next.${section}`)}</p>
      <Link to="/seeker/dashboard" className="button-secondary">{t('seeker.navigation.overview')}</Link>
    </section>
  );
}
