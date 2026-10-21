import { describe, expect, it } from 'vitest';
import { ConfigError, readAppConfig } from './appConfig';

const fb = {
  VITE_FIREBASE_API_KEY: 'k',
  VITE_FIREBASE_AUTH_DOMAIN: 'd',
  VITE_FIREBASE_APP_ID: 'a',
};

describe('readAppConfig', () => {
  it('por defecto es modo demo, sin Firebase', () => {
    expect(readAppConfig({})).toMatchObject({ mode: 'demo', firebase: null });
  });

  it('exige configuración completa fuera del modo demo', () => {
    expect(() => readAppConfig({ VITE_APP_MODE: 'firebase' })).toThrow(ConfigError);
  });

  it('con emuladores solo admite proyectos demo-*', () => {
    expect(() =>
      readAppConfig({ ...fb, VITE_APP_MODE: 'emulators', VITE_FIREBASE_PROJECT_ID: 'arima-real' }),
    ).toThrow(/demo-/);
    expect(
      readAppConfig({
        ...fb,
        VITE_APP_MODE: 'emulators',
        VITE_FIREBASE_PROJECT_ID: 'demo-arima-ficha',
      }).mode,
    ).toBe('emulators');
  });

  it('rechaza modos desconocidos', () => {
    expect(() => readAppConfig({ VITE_APP_MODE: 'prod' })).toThrow(ConfigError);
  });
});
