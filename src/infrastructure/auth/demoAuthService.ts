import type { Role } from '../../domain/auth/roles';
import { DEMO_USERS_BY_ROLE } from '../data/demoData';
import { AuthError, type AuthService, type SessionUser } from './types';

const STORAGE_KEY = 'arima-ficha.demo-session';

/**
 * Autenticación SIMULADA para el modo demostración. No hay contraseñas: se
 * elige un perfil ficticio. Nunca se usa con Firebase real.
 */
export function createDemoAuthService(storage: Storage | null = safeSessionStorage()): AuthService {
  const listeners = new Set<(u: SessionUser | null) => void>();
  let current: SessionUser | null = restore(storage);

  const emit = () => listeners.forEach((l) => l(current));

  return {
    kind: 'demo',
    subscribe(listener) {
      listeners.add(listener);
      listener(current);
      return () => listeners.delete(listener);
    },
    async signInWithEmail() {
      // En modo demo no se aceptan credenciales: evita que alguien crea que
      // ha iniciado sesión "de verdad".
      throw new AuthError('invalid-credentials');
    },
    async signInAsDemo(role: Role) {
      current = toSession(role);
      storage?.setItem(STORAGE_KEY, role);
      emit();
    },
    async signOut() {
      current = null;
      storage?.removeItem(STORAGE_KEY);
      emit();
    },
  };
}

function toSession(role: Role): SessionUser {
  const e = DEMO_USERS_BY_ROLE[role];
  return {
    uid: `demo-uid-${e.id}`,
    employeeId: e.id,
    displayName: e.displayName,
    email: e.email,
    role,
    isDemo: true,
  };
}

function restore(storage: Storage | null): SessionUser | null {
  const v = storage?.getItem(STORAGE_KEY);
  return v === 'employee' || v === 'coordinator' || v === 'admin' || v === 'auditor'
    ? toSession(v)
    : null;
}

function safeSessionStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}
