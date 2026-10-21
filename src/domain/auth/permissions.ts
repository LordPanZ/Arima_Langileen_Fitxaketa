import type { Role } from './roles';

/**
 * Matriz de permisos. Fuente única para UI y Cloud Functions.
 * Las reglas de Firestore (firestore.rules) replican la parte de lectura;
 * tests/rules comprueba que coinciden en los casos clave.
 */
export type Permission =
  /** Fichar (entrada, salida, pausas) para uno mismo. */
  | 'clock:self'
  | 'history:read-self'
  | 'events:read-assigned'
  | 'correction:request-self'
  | 'correction:withdraw-self'
  /** Ver equipo y eventos que coordina. */
  | 'team:read'
  | 'events:read-all'
  | 'events:manage'
  | 'employees:read'
  | 'employees:manage'
  | 'roles:assign'
  | 'records:read-all'
  | 'correction:review'
  | 'incidents:read'
  | 'incidents:manage'
  | 'audit:read'
  | 'labor-rules:manage'
  | 'records:export';

const SELF_SERVICE: readonly Permission[] = [
  'clock:self',
  'history:read-self',
  'events:read-assigned',
  'correction:request-self',
  'correction:withdraw-self',
];

export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  employee: SELF_SERVICE,
  coordinator: [...SELF_SERVICE, 'team:read', 'events:read-all', 'events:manage', 'incidents:read'],
  admin: [
    ...SELF_SERVICE,
    'team:read',
    'events:read-all',
    'events:manage',
    'employees:read',
    'employees:manage',
    'roles:assign',
    'records:read-all',
    'correction:review',
    'incidents:read',
    'incidents:manage',
    'audit:read',
    'labor-rules:manage',
    'records:export',
  ],
  // Auditor: solo lectura. No ficha (no es plantilla operativa por defecto),
  // no modifica nada, no revisa correcciones.
  auditor: [
    'employees:read',
    'events:read-all',
    'records:read-all',
    'incidents:read',
    'audit:read',
    'records:export',
  ],
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Roles con acceso al área de administración (cualquier permiso de gestión o lectura global). */
export function hasBackofficeAccess(role: Role | null | undefined): boolean {
  return can(role, 'team:read') || can(role, 'records:read-all');
}
