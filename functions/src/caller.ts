import { can, type Permission } from '../../src/domain/auth/permissions';
import { isRole, type Role } from '../../src/domain/auth/roles';
import { isStableId } from '../../src/domain/model/ids';
import { AppError } from './errors';

/** Identidad verificada de quien llama (derivada SOLO del token de Firebase Auth). */
export interface Caller {
  readonly uid: string;
  readonly role: Role;
  readonly employeeId: string;
}

/** Forma mínima de `request.auth` de una callable (sin depender de firebase-functions). */
export interface AuthLike {
  readonly uid: string;
  readonly token: Readonly<Record<string, unknown>>;
}

/**
 * Resuelve y valida la identidad. Nunca se confía en datos del cuerpo de la
 * petición para saber quién es el usuario o qué rol tiene.
 */
export function resolveCaller(auth: AuthLike | undefined | null): Caller {
  if (!auth?.uid) throw new AppError('UNAUTHENTICATED', 'Se requiere iniciar sesión');
  const role = auth.token['role'];
  const employeeId = auth.token['employeeId'];
  if (!isRole(role) || typeof employeeId !== 'string' || !isStableId(employeeId)) {
    throw new AppError(
      'MISSING_CLAIMS',
      'La cuenta no tiene rol asignado. Contacta con administración.',
    );
  }
  return { uid: auth.uid, role, employeeId };
}

export function requirePermission(caller: Caller, permission: Permission): void {
  if (!can(caller.role, permission)) {
    throw new AppError('FORBIDDEN', `El rol "${caller.role}" no tiene el permiso "${permission}"`);
  }
}
