import { readAppConfig, type AppConfig } from '../infrastructure/config/appConfig';
import type { AuthService } from '../infrastructure/auth/types';
import { createDemoAuthService } from '../infrastructure/auth/demoAuthService';
import type { DataSource } from '../infrastructure/data/types';
import { createDemoDataSource } from '../infrastructure/data/demoDataSource';
import { deviceClock, type ServerClock } from '../infrastructure/time/serverClock';

export interface AppServices {
  config: AppConfig;
  auth: AuthService;
  data: DataSource;
  serverClock: ServerClock;
}

/**
 * Composición de dependencias según el modo (demo / emuladores / firebase).
 * El SDK de Firebase se carga bajo demanda: el modo demo no lo descarga.
 */
export async function createAppServices(
  env: ImportMetaEnv = import.meta.env,
): Promise<AppServices> {
  const config = readAppConfig(env as unknown as Record<string, string | boolean | undefined>);
  if (config.mode === 'demo') {
    return {
      config,
      auth: createDemoAuthService(),
      data: createDemoDataSource(),
      serverClock: deviceClock,
    };
  }
  const [{ getFirebaseClients }, { createFirebaseAuthService }, { createFunctionsServerClock }] =
    await Promise.all([
      import('../infrastructure/firebase/firebaseClient'),
      import('../infrastructure/auth/firebaseAuthService'),
      import('../infrastructure/time/functionsServerClock'),
    ]);
  const fb = getFirebaseClients(config);
  return {
    config,
    auth: createFirebaseAuthService(fb.auth),
    // Fase 1: las pantallas muestran datos de demostración también con
    // Firebase. La fuente Firestore llega en la fase 2.
    data: createDemoDataSource(),
    serverClock: createFunctionsServerClock(fb.functions),
  };
}
