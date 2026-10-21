import { NavLink, Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';
import { can, hasBackofficeAccess } from '../../domain/auth/permissions';
import { useServices } from '../../app/ServicesContext';
import { useSessionUser } from '../auth/AuthContext';
import { DemoBanner } from './DemoBanner';
import { LanguageSwitcher } from './LanguageSwitcher';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

export function AppShell({ area }: { area: 'worker' | 'admin' }) {
  const { t } = useTranslation();
  const { auth } = useServices();
  const user = useSessionUser();

  const workerNav: NavItem[] = [
    { to: '/app', label: t('nav.home'), icon: '⌂', end: true },
    { to: '/app/clock', label: t('nav.clock'), icon: '◷' },
    { to: '/app/history', label: t('nav.history'), icon: '☰' },
    { to: '/app/events', label: t('nav.events'), icon: '★' },
  ];
  const adminNav: NavItem[] = [
    { to: '/admin', label: t('nav.adminHome'), icon: '▦', end: true },
    { to: '/admin/employees', label: t('nav.employees'), icon: '☺' },
    { to: '/admin/events', label: t('nav.adminEvents'), icon: '★' },
    { to: '/admin/incidents', label: t('nav.incidents'), icon: '!' },
  ];
  const nav = area === 'worker' ? workerNav : adminNav;
  const canSwitchToAdmin = area === 'worker' && hasBackofficeAccess(user.role);
  const canSwitchToWorker = area === 'admin' && can(user.role, 'clock:self');

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <DemoBanner />
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-2">
          <div className="min-w-0">
            <p className="text-sm font-black tracking-tight text-teal-800">ARIMA FICHA</p>
            <p className="truncate text-xs text-slate-500" data-testid="session-user">
              {user.displayName} · {t(`roles.${user.role ?? 'none'}`)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => void auth.signOut()}
              className="min-h-9 rounded-lg px-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {t('auth.signOut')}
            </button>
          </div>
        </div>
        {(canSwitchToAdmin || canSwitchToWorker) && (
          <div className="mx-auto max-w-3xl px-4 pb-2">
            <NavLink
              to={canSwitchToAdmin ? '/admin' : '/app'}
              className="text-sm font-semibold text-teal-700 underline-offset-2 hover:underline"
            >
              {canSwitchToAdmin ? t('nav.goAdmin') : t('nav.goWorker')}
            </NavLink>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-28">
        <Outlet />
      </main>

      <nav
        aria-label={t('nav.label')}
        className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto grid max-w-3xl grid-cols-4">
          {nav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end ?? false}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${isActive ? 'text-teal-700' : 'text-slate-500'}`
                }
              >
                <span aria-hidden="true" className="text-lg leading-none">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
