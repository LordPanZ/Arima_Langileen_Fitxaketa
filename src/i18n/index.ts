import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './locales/es.json';
import eu from './locales/eu.json';

export const SUPPORTED_LOCALES = ['eu', 'es'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const STORAGE_KEY = 'arima-ficha.locale';

export const resources = { es: { translation: es }, eu: { translation: eu } } as const;

function detectInitialLocale(): SupportedLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'es' || stored === 'eu') return stored;
  } catch {
    /* almacenamiento no disponible */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'es';
  return nav.startsWith('eu') ? 'eu' : 'es';
}

export function initI18n(lng: SupportedLocale = detectInitialLocale()) {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources,
      lng,
      fallbackLng: 'es',
      supportedLngs: ['es', 'eu'],
      interpolation: { escapeValue: false },
      returnNull: false,
    });
    i18n.on('languageChanged', (l) => {
      if (typeof document !== 'undefined') document.documentElement.lang = l;
    });
    if (typeof document !== 'undefined') document.documentElement.lang = lng;
  }
  return i18n;
}

export async function changeLocale(lng: SupportedLocale): Promise<void> {
  await i18n.changeLanguage(lng);
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* sin persistencia */
  }
}

export default i18n;
