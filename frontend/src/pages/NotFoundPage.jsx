import { ArrowUpRight, CircleHelp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <main id="main-content" className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <section className="surface-card w-full max-w-xl text-center">
        <CircleHelp className="mx-auto h-8 w-8 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" />
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-[#2B362E]">{t('common.notFoundTitle')}</h1>
        <p className="mx-auto mt-3 max-w-prose text-sm leading-relaxed text-[#1C221E] sm:text-base">{t('common.notFoundBody')}</p>
        <Link className="button-primary mt-6" to="/">{t('common.backHome')}<ArrowUpRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.75} aria-hidden="true" /></Link>
      </section>
    </main>
  );
}
