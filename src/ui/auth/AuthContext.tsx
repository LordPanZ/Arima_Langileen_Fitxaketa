import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useServices } from '../../app/ServicesContext';
import type { SessionUser } from '../../infrastructure/auth/types';

interface AuthState {
  status: 'loading' | 'signed-out' | 'signed-in';
  user: SessionUser | null;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth } = useServices();
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  useEffect(
    () =>
      auth.subscribe((user) =>
        setState(user ? { status: 'signed-in', user } : { status: 'signed-out', user: null }),
      ),
    [auth],
  );

  const value = useMemo(() => state, [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}

/** Usuario autenticado (solo dentro de rutas protegidas). */
// eslint-disable-next-line react-refresh/only-export-components
export function useSessionUser(): SessionUser {
  const { user } = useAuth();
  if (!user) throw new Error('useSessionUser sin sesión');
  return user;
}
