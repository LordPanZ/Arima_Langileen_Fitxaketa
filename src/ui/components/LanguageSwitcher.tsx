import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, changeLocale } from '../../i18n';
import { useLocale } from '../hooks/useLocale';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const current = useLocale();
  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className={`inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm ${className}`}
    >
      {SUPPORTED_LOCALES.map((lng) => (
        <button
          key={lng}
          type="button"
          lang={lng}
          aria-pressed={current === lng}
          onClick={() => void changeLocale(lng)}
          className={`min-h-9 rounded-md px-3 font-medium ${current === lng ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
        >
          {t(`language.short.${lng}`)}
        </button>
      ))}
    </div>
  );
}
