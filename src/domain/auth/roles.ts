/**
 * Roles de la aplicación. Se guardan como custom claim "role" en el token de
 * Firebase Auth (solo los asigna el backend) y se validan en:
 *  - la UI (para mostrar u ocultar pantallas: comodidad, NO seguridad),
 *  - las reglas de Firestore,
 *  - cada Cloud Function.
 */
export const ROLES = ['employee', 'coordinator', 'admin', 'auditor'] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}
