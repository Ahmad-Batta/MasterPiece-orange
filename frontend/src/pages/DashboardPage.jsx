import { ArrowUpRight, BriefcaseBusiness, Building2, CircleUserRound, LogOut, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '../components/Button';
import { useAuth, dashboardPath } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const dashboardMeta = {
  seeker: { title: 'dashboard.seekerTitle', nav: 'dashboard.seekerNav', icon: CircleUserRound, badge: 'auth.roleSeekerBadge' },
  company: { title: 'dashboard.companyTitle', nav: 'dashboard.companyNav', icon: Building2, badge: 'auth.roleCompanyBadge' },
  admin: { title: 'dashboard.adminTitle', nav: 'dashboard.adminNav', icon: ShieldCheck, badge: 'auth.roleAdminBadge' },
};

export default function DashboardPage({ role }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { notify } = useToast();
  const meta = dashboardMeta[role];
  const Icon = meta.icon;
  const displayName = user?.name || user?.company_name || user?.username || '';

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      notify(t('dashboard.logoutSuccess'));
    }
  };

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <section className="mb-8 flex flex-col gap-6 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E5E2D9] bg-white px-3 py-2 text-xs font-medium tracking-wide text-[#2B362E]">
            <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t(meta.badge)}
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-[#2B362E] sm:text-4xl">{t('dashboard.welcome', { name: displayName })}</h1>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-[#1C221E] sm:text-base">{t('dashboard.subtitle')}</p>
        </div>
        <Button variant="secondary" onClick={handleLogout}><LogOut className="h-4 w-4 rtl:rotate-180" strokeWidth={1.75} aria-hidden="true" />{t('nav.logout')}</Button>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="surface-card">
          <p className="text-xs font-semibold tracking-wide text-[#A37E5E]">{t('dashboard.phaseLabel')}</p>
          <h2 className="mt-4 font-display text-2xl font-semibold leading-relaxed text-[#2B362E]">{t('dashboard.phaseTitle')}</h2>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-[#1C221E]">{t('dashboard.phaseBody')}</p>
          <Link className="button-primary mt-6" to="/">
            <BriefcaseBusiness className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            {t('nav.opportunities')}
            <ArrowUpRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </section>

        <aside className="surface-card">
          <h2 className="text-base font-semibold text-[#2B362E] sm:text-lg">{t(meta.title)}</h2>
          <div className="mt-5 flex items-start gap-3 border-t border-[#E5E2D9] pt-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FAF9F5] text-[#2B362E]"><Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-[#1C221E]/70">{t('dashboard.roleLabel')}</p>
              <p className="mt-1 text-sm font-semibold text-[#2B362E]">{t(meta.badge)}</p>
            </div>
          </div>
          <p className="mt-5 break-all text-sm text-[#1C221E]" dir="auto">{user?.email}</p>
          <Link className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg text-sm font-semibold text-[#2B362E] underline decoration-[#A37E5E] underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]" to={dashboardPath(role)}>{t(meta.nav)}</Link>
        </aside>
      </div>
    </main>
  );
}
