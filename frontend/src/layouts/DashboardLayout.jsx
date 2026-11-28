import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, BriefcaseBusiness, Building2, CheckCheck, CreditCard, FileText, LayoutDashboard, LogOut, Search, Settings2, ShieldCheck, Tags, UserRound, Users, X } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ProfileAvatar from '../components/ProfileAvatar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getApiData, getApiItems } from '../utils/apiResponse';
import { useAdminPreferences } from '../utils/adminPreferences';
import { openBilling } from '../utils/seekerProfile';

const adminNavigation = [
  { to: '/admin', key: 'overview', Icon: LayoutDashboard, end: true },
  { to: '/admin/users', key: 'users', Icon: Users },
  { to: '/admin/companies', key: 'companies', Icon: Building2 },
  { to: '/admin/catalog', key: 'catalog', Icon: Tags },
  { to: '/admin/jobs', key: 'jobs', Icon: BriefcaseBusiness },
  { to: '/admin/settings', key: 'settings', Icon: Settings2 },
  { to: '/admin/payments', key: 'payments', Icon: CreditCard },
];

const seekerNavigation = [
  { to: '/seeker/dashboard', key: 'overview', Icon: LayoutDashboard, end: true },
  { to: '/seeker/profile', key: 'profile', Icon: UserRound },
  { to: '/seeker/cv-builder', key: 'cv', Icon: FileText },
  { to: '/seeker/jobs', key: 'jobs', Icon: Search },
  { to: '/seeker/applications', key: 'applications', Icon: BriefcaseBusiness },
  { to: '/seeker/settings', key: 'settings', Icon: Settings2 },
];

function responsePayload(response) {
  return response?.data?.data ?? {};
}

function notificationItems(payload) {
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.notifications)) return payload.notifications;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function NotificationMenu() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async (signal) => {
    setIsLoading(true);
    try {
      const response = await api.get('/notifications', { signal });
      const payload = responsePayload(response);
      const items = notificationItems(payload);
      setNotifications(items);
      setUnreadCount(Number(payload.unread_count ?? items.filter((item) => !item.read_at).length));
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') notify(t('admin.notifications.loadError'), 'error');
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [notify, t]);

  useEffect(() => {
    const controller = new AbortController();
    loadNotifications(controller.signal);
    return () => controller.abort();
  }, [loadNotifications]);

  const markRead = async (id) => {
    const notification = notifications.find((item) => item.id === id);
    if (!notification || notification.read_at) return;
    setIsUpdating(true);
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch {
      notify(t('admin.notifications.updateError'), 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    setIsUpdating(true);
    try {
      await api.patch('/notifications/read-all');
      setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      notify(t('admin.notifications.updateError'), 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative">
      <button
        className="relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-[#E5E2D9] bg-white text-[#2B362E] transition-colors duration-150 hover:bg-[#FAF9F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={t('admin.notifications.open', { count: unreadCount })}
        aria-expanded={isOpen}
        aria-controls="admin-notifications-menu"
      >
        <Bell className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        {unreadCount > 0 && <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#A37E5E] px-1 text-[9px] font-semibold text-white tabular-nums">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.section
            id="admin-notifications-menu"
            className="absolute end-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#E5E2D9] bg-white shadow-sm"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            aria-label={t('admin.notifications.title')}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#E5E2D9] p-4">
              <div>
                <h2 className="text-sm font-semibold text-[#2B362E]">{t('admin.notifications.title')}</h2>
                <p className="mt-1 text-xs text-[#1C221E]/70">{t('admin.notifications.unread', { count: unreadCount })}</p>
              </div>
              <div className="flex items-center gap-1">
                <button className="inline-flex h-8 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg px-2 text-[10px] font-medium text-[#2B362E] transition-colors duration-150 hover:bg-[#FAF9F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={markAllRead} disabled={isUpdating || unreadCount === 0}>
                  <CheckCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />{t('admin.notifications.markAllRead')}
                </button>
                <button className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#2B362E] transition-colors duration-150 hover:bg-[#FAF9F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]" type="button" onClick={() => setIsOpen(false)} aria-label={t('common.close')}>
                  <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto" aria-busy={isLoading}>
              {isLoading ? (
                <div className="space-y-3 p-4" aria-label={t('common.loading')}>
                  {[0, 1, 2].map((item) => <div key={item} className="animate-pulse space-y-2"><div className="h-3 w-2/3 rounded-lg bg-[#E5E2DC]/60" /><div className="h-3 w-full rounded-lg bg-[#E5E2DC]/60" /></div>)}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 p-6 text-center">
                  <Bell className="h-5 w-5 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" />
                  <p className="text-xs font-medium text-[#2B362E]">{t('admin.notifications.emptyTitle')}</p>
                  <p className="text-xs text-[#1C221E]/70">{t('admin.notifications.emptyBody')}</p>
                </div>
              ) : (
                <ul className="divide-y divide-[#E5E2DC]">
                  {notifications.map((item) => (
                    <li key={item.id}>
                      <button className="flex w-full cursor-pointer items-start gap-3 p-4 text-start transition-colors duration-150 hover:bg-[#FAF9F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#A37E5E]" type="button" onClick={() => markRead(item.id)} disabled={isUpdating}>
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read_at ? 'bg-[#E5E2DC]' : 'bg-[#A37E5E]'}`} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold text-[#2B362E]" dir="auto">{item.title}</span>
                          <span className="mt-1 block text-xs leading-relaxed text-[#1C221E]/75" dir="auto">{item.message}</span>
                        </span>
                        {!item.read_at && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#A37E5E]" aria-hidden="true" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DashboardLayout() {
  const { t } = useTranslation();
  const { role, user, logout } = useAuth();
  const isSeeker = role === 'seeker';
  const { notify } = useToast();
  const navigate = useNavigate();
  const preferences = useAdminPreferences();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(isSeeker);
  const [profileError, setProfileError] = useState(false);
  const [resumeDraft, setResumeDraft] = useState(null);
  const displayName = profile?.name || user?.name || user?.username || user?.email || '';
  const imageUrl = profile?.image_url || user?.image_url;

  const reloadProfile = useCallback(async (signal) => {
    setProfileLoading(true);
    setProfileError(false);
    try {
      const response = await api.get('/seeker/profile', { signal });
      if (!signal?.aborted) setProfile(getApiData(response));
    } catch (error) {
      if (!signal?.aborted && error.code !== 'ERR_CANCELED') setProfileError(true);
    } finally {
      if (!signal?.aborted) setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSeeker) return undefined;
    let controller;
    const refresh = () => {
      controller?.abort();
      controller = new AbortController();
      reloadProfile(controller.signal);
    };
    refresh();
    const events = ['careerhub:billing-updated', 'careerhub:quota-exceeded'];
    events.forEach((event) => window.addEventListener(event, refresh));
    return () => {
      controller.abort();
      events.forEach((event) => window.removeEventListener(event, refresh));
    };
  }, [isSeeker, reloadProfile]);

  const loadPendingVerifications = useCallback(async (signal) => {
    try {
      const response = await api.get('/admin/verifications', { params: { per_page: 100 }, signal });
      const payload = getApiData(response);
      const items = getApiItems(payload);
      setPendingVerifications(Number(payload.pagination?.total ?? items.length));
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') setPendingVerifications(0);
    }
  }, []);

  useEffect(() => {
    if (role !== 'admin') return undefined;
    const controller = new AbortController();
    const refresh = () => loadPendingVerifications();
    loadPendingVerifications(controller.signal);
    window.addEventListener('careerhub:company-verifications-updated', refresh);
    return () => {
      controller.abort();
      window.removeEventListener('careerhub:company-verifications-updated', refresh);
    };
  }, [loadPendingVerifications, role]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      notify(t('admin.shell.logoutError'), 'error');
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] lg:flex">
      <aside className="border-b border-[#E5E2DC] bg-white lg:fixed lg:inset-y-0 lg:start-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-e">
        <div className="flex items-center gap-3 px-4 py-3 lg:px-6 lg:py-6">
          {isSeeker
            ? <ProfileAvatar src={imageUrl} name={displayName} className="h-9 w-9 text-xs" />
            : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2B362E] text-xs font-semibold text-white" aria-hidden="true">CH</span>}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#2B362E]">{t('nav.brand')}</p>
            <p className="mt-0.5 text-[10px] font-medium tracking-wide text-[#A37E5E]">{t(isSeeker ? 'seeker.workspace' : 'admin.shell.label')}</p>
          </div>
          {!isSeeker && <ShieldCheck className="ms-auto h-4 w-4 shrink-0 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" />}
        </div>

        <nav className="flex gap-2 overflow-x-auto px-4 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-4 lg:py-4" aria-label={t(isSeeker ? 'seeker.navigationLabel' : 'admin.shell.navigation')}>
          {(isSeeker ? seekerNavigation : adminNavigation).map(({ to, key, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 lg:w-full ${isActive ? 'bg-[#2B362E] text-white' : 'text-[#1C221E] hover:bg-[#FAF9F5]'}`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              {t(`${isSeeker ? 'seeker' : 'admin'}.navigation.${key}`)}
              {key === 'companies' && preferences.showPendingVerificationBadge && pendingVerifications > 0 && (
                <span className="ms-auto inline-flex min-w-5 items-center justify-center rounded-full border border-[#E6D7C8] bg-[#F5EFEA] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[#8E6B4D]" aria-label={t('admin.navigation.pendingVerifications', { count: pendingVerifications })}>
                  {pendingVerifications > 99 ? '99+' : pendingVerifications}
                </span>
              )}
            </NavLink>
          ))}
          {isSeeker ? <button type="button" className="button-secondary shrink-0 lg:mt-auto lg:w-full" onClick={openBilling}>
            <CreditCard className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('billing.title')}
          </button> : <div className="mt-auto hidden border-t border-[#E5E2DC] pt-4 lg:block">
            <p className="px-3 text-[10px] leading-relaxed text-[#1C221E]/60">{t('admin.shell.sidebarNote')}</p>
          </div>}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 lg:ms-64">
        <header className="sticky top-0 z-20 border-b border-[#E5E2DC] bg-white/95 backdrop-blur">
          <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
              {isSeeker && <ProfileAvatar src={imageUrl} name={displayName} className="h-8 w-8 text-xs" />}
              <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[#2B362E]" dir="auto">{displayName}</p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-[#E5E2DC] bg-[#FAF9F5] px-2 py-0.5 text-[10px] font-medium text-[#2B362E]">
                {isSeeker ? t('admin.usersCompanies.roles.seeker') : <><ShieldCheck className="h-3 w-3 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" />{t('admin.shell.roleBadge')}</>}
              </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <LanguageSwitcher />
              <NotificationMenu />
              <button className="inline-flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-[#E5E2DC] bg-white px-3 text-xs font-medium text-[#2B362E] transition-colors duration-150 hover:bg-[#FAF9F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={handleLogout} disabled={isLoggingOut}>
                <LogOut className="h-4 w-4 rtl:rotate-180" strokeWidth={1.75} aria-hidden="true" />
                <span className="hidden sm:inline">{t('nav.logout')}</span>
                <span className="sr-only sm:hidden">{t('nav.logout')}</span>
              </button>
            </div>
          </div>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8" aria-live="polite">
          <Outlet context={{ profile, setProfile, profileLoading, profileError, reloadProfile, resumeDraft, setResumeDraft }} />
        </main>
      </div>
    </div>
  );
}
