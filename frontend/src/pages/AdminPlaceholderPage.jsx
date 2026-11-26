import { ArrowUpRight, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function AdminPlaceholderPage({ section }) {
  const { t } = useTranslation();

  return (
    <section className="rounded-xl border border-[#E5E2DC] bg-white p-6 shadow-sm">
      <p className="mb-2 text-xs font-semibold tracking-wide text-[#A37E5E]">{t('admin.placeholder.eyebrow')}</p>
      <h1 className="text-xl font-semibold text-[#2B362E]">{t(`admin.placeholder.${section}.title`)}</h1>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-[#1C221E]">{t(`admin.placeholder.${section}.body`)}</p>
      <Link className="button-primary mt-6 h-10 px-4 text-xs" to="/admin/dashboard">
        <LayoutDashboard className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        {t('admin.navigation.overview')}
        <ArrowUpRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.75} aria-hidden="true" />
      </Link>
    </section>
  );
}
