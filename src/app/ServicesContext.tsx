import { createContext, useContext, type ReactNode } from 'react';
import type { AppServices } from './services';

const ServicesContext = createContext<AppServices | null>(null);

export function ServicesProvider({
  services,
  children,
}: {
  services: AppServices;
  children: ReactNode;
}) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useServices(): AppServices {
  const s = useContext(ServicesContext);
  if (!s) throw new Error('useServices fuera de ServicesProvider');
  return s;
}
