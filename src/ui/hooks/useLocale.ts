import { useTranslation } from 'react-i18next';
import type { Locale } from '../../domain/model/employee';

export function useLocale(): Locale {
  const { i18n } = useTranslation();
  return i18n.resolvedLanguage === 'eu' ? 'eu' : 'es';
}
