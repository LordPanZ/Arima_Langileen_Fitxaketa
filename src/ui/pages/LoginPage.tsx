import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ROLES, type Role } from '../../domain/auth/roles';
import { useServices } from '../../app/ServicesContext';
import { AuthError } from '../../infrastructure/auth/types';
import { useAuth } from '../auth/AuthContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { DemoBanner } from '../components/DemoBanner';

export function LoginPage() {
  const { t } = useTranslation();
  const { auth, config } = useServices();
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === 'signed-in') return <Navigate to={from} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await auth.signInWithEmail(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(t(`auth.errors.${err instanceof AuthError ? err.code : 'unknown'}`));
    } finally {
      setBusy(false);
    }
  };

  const demoSignIn = async (role: Role) => {
    await auth.signInAsDemo?.(role);
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-teal-50 to-slate-50">
      <DemoBanner />
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 pb-16">
        <h1 className="text-center text-3xl font-black tracking-tight text-teal-800">
          ARIMA FICHA
        </h1>
        <p className="mt-1 mb-8 text-center text-sm text-slate-600">{t('login.subtitle')}</p>

        {auth.kind === 'demo' ? (
          <section
            aria-labelledby="demo-title"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 id="demo-title" className="text-lg font-bold text-slate-900">
              {t('login.demoTitle')}
            </h2>
            <p className="mt-1 mb-4 text-sm text-slate-600">{t('login.demoHelp')}</p>
            <ul className="flex flex-col gap-2">
              {ROLES.map((role) => (
                <li key={role}>
                  <button
                    type="button"
                    onClick={() => void demoSignIn(role)}
                    className="flex min-h-12 w-full items-center justify-between rounded-xl border border-slate-300 px-4 text-left font-semibold text-slate-800 hover:border-teal-600 hover:bg-teal-50"
                  >
                    <span>{t('login.demoAs', { role: t(`roles.${role}`) })}</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <form
            onSubmit={(e) => void onSubmit(e)}
            className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            noValidate
          >
            <h2 className="text-lg font-bold text-slate-900">{t('login.title')}</h2>
            {config.mode === 'emulators' && (
              <p className="text-xs text-slate-500">{t('login.emulatorHint')}</p>
            )}
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              {t('login.email')}
              <input
                type="email"
                autoComplete="username"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-h-12 rounded-xl border border-slate-300 px-3 text-base"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              {t('login.password')}
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-h-12 rounded-xl border border-slate-300 px-3 text-base"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-rose-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || !email || !password}
              className="min-h-12 rounded-xl bg-teal-700 font-bold text-white disabled:opacity-50"
            >
              {busy ? t('common.loading') : t('login.submit')}
            </button>
            <p className="text-xs text-slate-500">{t('login.individualAccounts')}</p>
          </form>
        )}
        <p className="mt-6 text-center text-xs text-slate-500">{t('login.privacy')}</p>
      </main>
    </div>
  );
}
