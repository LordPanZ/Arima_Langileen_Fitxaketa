import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type Auth,
} from 'firebase/auth';
import { isRole } from '../../domain/auth/roles';
import { AuthError, type AuthService, type SessionUser } from './types';

/**
 * Acceso individual con correo y contraseña de Firebase Auth. Cada persona
 * tiene su propia cuenta: no hay cuentas compartidas.
 * El rol se lee del token (custom claims) y lo asigna solo el backend.
 */
export function createFirebaseAuthService(auth: Auth): AuthService {
  return {
    kind: 'firebase',
    subscribe(listener) {
      return onIdTokenChanged(auth, (user) => {
        if (!user) {
          listener(null);
          return;
        }
        void user.getIdTokenResult().then((token) => {
          const role = token.claims['role'];
          const employeeId = token.claims['employeeId'];
          const session: SessionUser = {
            uid: user.uid,
            employeeId: typeof employeeId === 'string' ? employeeId : null,
            displayName: user.displayName ?? user.email ?? user.uid,
            email: user.email,
            role: isRole(role) ? role : null,
            isDemo: false,
          };
          listener(session);
        });
      });
    },
    async signInWithEmail(email, password) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        const code = (err as { code?: string }).code ?? '';
        if (
          code.includes('invalid-credential') ||
          code.includes('wrong-password') ||
          code.includes('user-not-found') ||
          code.includes('invalid-email')
        ) {
          throw new AuthError('invalid-credentials');
        }
        if (code.includes('too-many-requests')) throw new AuthError('too-many-requests');
        if (code.includes('network')) throw new AuthError('network');
        throw new AuthError('unknown');
      }
    },
    async signOut() {
      await fbSignOut(auth);
    },
  };
}
