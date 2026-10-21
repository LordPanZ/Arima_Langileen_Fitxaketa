import type { Role } from '../../domain/auth/roles';

/** Usuario de la sesión, con identidad y rol procedentes del token. */
export interface SessionUser {
  uid: string;
  employeeId: string | null;
  displayName: string;
  email: string | null;
  /** null = cuenta sin rol asignado: no puede usar la app. */
  role: Role | null;
  isDemo: boolean;
}

export type AuthErrorCode = 'invalid-credentials' | 'too-many-requests' | 'network' | 'unknown';

export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(code);
    this.name = 'AuthError';
  }
}

export interface AuthService {
  readonly kind: 'demo' | 'firebase';
  /** Se llama con el usuario actual al suscribirse y en cada cambio. */
  subscribe(listener: (user: SessionUser | null) => void): () => void;
  signInWithEmail(email: string, password: string): Promise<void>;
  /** Solo en modo demo: entra con un perfil ficticio. */
  signInAsDemo?(role: Role): Promise<void>;
  signOut(): Promise<void>;
}
