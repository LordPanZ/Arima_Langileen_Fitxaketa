import { useMemo } from 'react';
import { RouterProvider } from 'react-router';
import { AuthProvider } from '../ui/auth/AuthContext';
import { createRouter } from './router';
import { ServicesProvider } from './ServicesContext';
import type { AppServices } from './services';

export function App({ services }: { services: AppServices }) {
  const router = useMemo(() => createRouter(), []);
  return (
    <ServicesProvider services={services}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ServicesProvider>
  );
}
