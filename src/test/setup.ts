import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import i18n, { initI18n } from '../i18n';

initI18n('es');

afterEach(async () => {
  cleanup();
  sessionStorage.clear();
  await i18n.changeLanguage('es');
});
