import { useEffect, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dashboardPath, useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar() {
  const { t } = useTranslation();
  const { session, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isLanding = location.pathname === '/';
  const isDark = isLanding && !isScrolled;

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 24);
    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollState);
  }, [location.pathname]);

  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/seeker/')) return null;

  const closeMenu = () => setMenuOpen(false);
  const navClass = `inline-flex h-8 cursor-pointer items-center whitespace-nowrap rounded-lg px-2 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 ${isDark ? 'text-[#FAF9F5] hover:bg-white/10 focus-visible:ring-offset-[#2B362E]' : 'text-[#1C221E] hover:bg-[#FAF9F5]'}`;
  const buttonClass = `inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 ${isDark ? 'border-white/30 bg-white/10 text-[#FAF9F5] hover:bg-white/15 focus-visible:ring-offset-[#2B362E]' : 'border-[#E5E2D9] bg-white text-[#2B362E] hover:bg-[#FAF9F5]'}`;
  const primaryLinkClass = `inline-flex h-8 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-[#2B362E] px-3 text-xs font-medium text-white transition-colors duration-150 hover:bg-[#1F2822] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 ${isDark ? 'focus-visible:ring-offset-[#2B362E]' : ''}`;

  return (
    <header className={`sticky top-0 z-50 border-b backdrop-blur transition-colors duration-300 ${isDark ? 'border-transparent bg-transparent' : 'border-[#E5E2D9] bg-[#FAF9F5]/95'}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <Link to="/" className={`inline-flex h-8 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 ${isDark ? 'text-[#FAF9F5] focus-visible:ring-offset-[#2B362E]' : 'text-[#2B362E]'}`} onClick={closeMenu} aria-label={t('nav.brand')}>
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg font-display text-xs font-semibold ${isDark ? 'bg-white/10 text-[#FAF9F5]' : 'bg-[#2B362E] text-white'}`} aria-hidden="true">CH</span>
          <span className="font-display text-base font-semibold tracking-tight">{t('nav.brand')}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label={t('nav.brand')}>
          <Link className={navClass} to="/">{t('nav.home')}</Link>
          {isLanding && <a className={navClass} href="#how-it-works">{t('nav.workflow')}</a>}
          {isLanding && <a className={navClass} href="#jobs">{t('nav.opportunities')}</a>}
          {isLanding && <a className={navClass} href="#pricing">{t('nav.pricing')}</a>}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher dark={isDark} />
          {session ? (
            <>
              <Link className={navClass} to={dashboardPath(session.role)}>{t('nav.workspace')}</Link>
              <button type="button" className={navClass} onClick={() => logout()}>{t('nav.logout')}</button>
            </>
          ) : (
            <>
              <Link className={navClass} to="/login">{t('nav.login')}</Link>
              <Link className={primaryLinkClass} to="/register">{t('nav.register')}<ArrowUpRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.75} aria-hidden="true" /></Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher dark={isDark} />
          <button type="button" className={buttonClass} onClick={() => setMenuOpen((open) => !open)} aria-label={t('nav.openMenu')} aria-expanded={menuOpen}>
            {menuOpen ? <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" /> : <Menu className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className={`border-t px-4 py-4 backdrop-blur-md md:hidden ${isDark ? 'border-white/15 bg-[#2B362E]/95' : 'border-[#E5E2D9] bg-[#FAF9F5]'}`} aria-label={t('nav.openMenu')}>
          <div className="mx-auto flex max-w-7xl flex-col gap-1 sm:px-2">
            <Link className={navClass} to="/" onClick={closeMenu}>{t('nav.home')}</Link>
            {isLanding && <a className={navClass} href="#how-it-works" onClick={closeMenu}>{t('nav.workflow')}</a>}
            {isLanding && <a className={navClass} href="#jobs" onClick={closeMenu}>{t('nav.opportunities')}</a>}
            {isLanding && <a className={navClass} href="#pricing" onClick={closeMenu}>{t('nav.pricing')}</a>}
            {session ? (
              <>
                <Link className={navClass} to={dashboardPath(session.role)} onClick={closeMenu}>{t('nav.workspace')}</Link>
                <button type="button" className={navClass} onClick={() => { closeMenu(); logout(); }}>{t('nav.logout')}</button>
              </>
            ) : (
              <>
                <Link className={navClass} to="/login" onClick={closeMenu}>{t('nav.login')}</Link>
                <Link className={primaryLinkClass} to="/register" onClick={closeMenu}>{t('nav.register')}</Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
