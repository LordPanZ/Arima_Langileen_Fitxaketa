import { useTranslation } from 'react-i18next';
import { useServices } from '../../app/ServicesContext';

export function NoRolePage() {
  const { t } = useTranslation();
  const { auth } = useServices();
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-bold">{t('noRole.title')}</h1>
      <p className="text-slate-600">{t('noRole.body')}</p>
      <button
        type="button"
        onClick={() => void auth.signOut()}
        className="min-h-12 rounded-xl bg-teal-700 px-6 font-bold text-white"
      >
        {t('auth.signOut')}
      </button>
    </main>
  );
}
