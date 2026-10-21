import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '../app/router';
import { ServicesProvider } from '../app/ServicesContext';
import type { AppServices } from '../app/services';
import { AuthProvider } from '../ui/auth/AuthContext';
import { createDemoAuthService } from '../infrastructure/auth/demoAuthService';
import { createDemoDataSource } from '../infrastructure/data/demoDataSource';
import { deviceClock } from '../infrastructure/time/serverClock';
import type { Role } from '../domain/auth/roles';

export async function renderApp(path: string, role: Role | null) {
  const auth = createDemoAuthService(null);
  if (role) await auth.signInAsDemo?.(role);
  const services: AppServices = {
    config: {
      mode: 'demo',
      firebase: null,
      functionsRegion: 'europe-southwest1',
      emulatorHost: '127.0.0.1',
    },
    auth,
    data: createDemoDataSource(() => new Date('2026-10-21T10:00:00.000Z')),
    serverClock: deviceClock,
  };
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const utils = render(
    <ServicesProvider services={services}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ServicesProvider>,
  );
  return { ...utils, router, services };
}
