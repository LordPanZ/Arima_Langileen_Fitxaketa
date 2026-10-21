/**
 * Configuración de la PWA a partir de variables VITE_* (ver .env.example).
 *
 * Modos:
 *  - demo:      sin Firebase ni red. Login con perfiles ficticios. Por defecto.
 *  - emulators: Firebase Auth/Firestore/Functions en local (proyecto demo-*).
 *  - firebase:  proyecto real. Requiere autorización (ver SECURITY.md).
 */
export type AppMode = 'demo' | 'emulators' | 'firebase';

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId?: string;
}

export interface AppConfig {
  mode: AppMode;
  firebase: FirebaseWebConfig | null;
  functionsRegion: string;
  emulatorHost: string;
}

type Env = Readonly<Record<string, string | boolean | undefined>>;

export class ConfigError extends Error {
  override name = 'ConfigError';
}

function str(env: Env, key: string): string | undefined {
  const v = env[key];
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
}

export function readAppConfig(env: Env): AppConfig {
  const rawMode = str(env, 'VITE_APP_MODE') ?? 'demo';
  if (rawMode !== 'demo' && rawMode !== 'emulators' && rawMode !== 'firebase') {
    throw new ConfigError(`VITE_APP_MODE no válido: "${rawMode}"`);
  }
  const mode: AppMode = rawMode;
  const functionsRegion = str(env, 'VITE_FUNCTIONS_REGION') ?? 'europe-southwest1';
  const emulatorHost = str(env, 'VITE_EMULATOR_HOST') ?? '127.0.0.1';
  if (mode === 'demo') return { mode, firebase: null, functionsRegion, emulatorHost };

  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_APP_ID',
  ];
  const missing = required.filter((k) => !str(env, k));
  if (missing.length) throw new ConfigError(`Faltan variables de entorno: ${missing.join(', ')}`);

  const projectId = str(env, 'VITE_FIREBASE_PROJECT_ID') as string;
  if (mode === 'emulators' && !projectId.startsWith('demo-')) {
    // Protección: con emuladores solo se usan proyectos "demo-*", que nunca
    // se conectan a servicios reales de Google Cloud.
    throw new ConfigError('En modo emuladores el projectId debe empezar por "demo-"');
  }
  const sender = str(env, 'VITE_FIREBASE_MESSAGING_SENDER_ID');
  return {
    mode,
    functionsRegion,
    emulatorHost,
    firebase: {
      apiKey: str(env, 'VITE_FIREBASE_API_KEY') as string,
      authDomain: str(env, 'VITE_FIREBASE_AUTH_DOMAIN') as string,
      projectId,
      appId: str(env, 'VITE_FIREBASE_APP_ID') as string,
      ...(sender ? { messagingSenderId: sender } : {}),
    },
  };
}
