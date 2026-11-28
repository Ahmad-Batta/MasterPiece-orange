import { ArrowUpRight, BriefcaseBusiness, MapPin, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { dashboardPath, useAuth } from '../context/AuthContext';

function formatNumber(value, language) {
  return new Intl.NumberFormat(language === 'ar' ? 'ar-JO' : 'en-US', { maximumFractionDigits: 0 }).format(value);
}

export default function JobCard({ job, matchPercentage }) {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const company = job.company?.name || job.company_name || t('jobs.companyFallback');
  const location = job.location || job.company?.location || t('jobs.locationMissing');
  const category = job.category || t('jobs.categoryMissing');
  const minimum = job.salary_min;
  const maximum = job.salary_max;
  const salary = minimum != null && maximum != null
    ? t('jobs.salaryRange', { min: formatNumber(minimum, i18n.language), max: formatNumber(maximum, i18n.language) })
    : minimum != null
      ? formatNumber(minimum, i18n.language)
      : maximum != null
        ? formatNumber(maximum, i18n.language)
        : t('jobs.salaryMissing');
  const isVerified = job.company?.verification_status === 'verified' || job.company?.is_verified === true;
  const destination = session?.role === 'seeker' ? '/seeker/jobs' : session ? dashboardPath(session.role) : '/login';

  return (
    <Link to={destination} state={!session ? { from: '/seeker/jobs' } : undefined} className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2" aria-label={t('jobs.cardSummary', { title: job.title, company, location, category, salary })}>
      <article className="surface-card flex min-h-full flex-col gap-4 transition-colors duration-150 group-hover:border-[#2B362E] group-focus-visible:border-[#A37E5E]">
        <h3 className="text-base font-semibold leading-relaxed text-[#2B362E] sm:text-lg">{job.title}</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm text-[#1C221E]">
          <BriefcaseBusiness className="h-4 w-4 shrink-0 text-[#2B362E]" strokeWidth={1.75} aria-hidden="true" />
          <span className="font-medium" dir="auto">{company}</span>
          {isVerified && <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-2 py-1 text-xs font-medium text-[#15803D]"><ShieldCheck className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('jobs.verified')}</span>}
        </div>
        <div className="flex items-start gap-2 text-sm leading-relaxed text-[#1C221E]">
          <MapPin className="mt-1 h-4 w-4 shrink-0 text-[#1C221E]/70" strokeWidth={1.75} aria-hidden="true" />
          <span dir="auto">{location}<span aria-hidden="true"> · </span>{category}</span>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-[#E5E2D9] pt-4 text-sm">
          <span className="tabular-nums text-[#1C221E]">{salary}</span>
          {matchPercentage != null
            ? <span className="rounded-full border border-[#E5E2D9] bg-[#FAF9F5] px-3 py-1 text-xs font-semibold tabular-nums text-[#2B362E]">{t('jobs.aiFitScore', { percentage: formatNumber(matchPercentage, i18n.language) })}</span>
            : <span className="inline-flex h-10 items-center gap-2 whitespace-nowrap font-medium text-[#2B362E]">{t('jobs.viewApply')}<ArrowUpRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.75} aria-hidden="true" /></span>}
        </div>
      </article>
    </Link>
  );
}
