import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-bold">{t('notFound.title')}</h1>
      <Link to="/" className="min-h-12 rounded-xl bg-teal-700 px-6 py-3 font-bold text-white">
        {t('common.backHome')}
      </Link>
    </main>
  );
}
