import type { AuditEventId, AuthUid, UtcInstant } from './ids';
import type { Role } from '../auth/roles';

export type AuditAction =
  | 'auth.sign-in'
  | 'auth.role-changed'
  | 'time-entry.created'
  | 'break-entry.created'
  | 'correction.requested'
  | 'correction.approved'
  | 'correction.rejected'
  | 'correction.withdrawn'
  | 'employee.created'
  | 'employee.updated'
  | 'event.created'
  | 'event.updated'
  | 'assignment.changed'
  | 'labor-rule.changed'
  | 'incident.status-changed'
  | 'records.exported';

export type AuditTargetType =
  | 'employee'
  | 'time-entry'
  | 'break-entry'
  | 'time-correction'
  | 'event'
  | 'event-assignment'
  | 'labor-rule'
  | 'incident'
  | 'export';

/**
 * Evento de auditoría. Solo lo escribe el backend (Admin SDK). Encadenado por
 * hash para detectar borrados o alteraciones (fase 2).
 */
export interface AuditEvent {
  readonly id: AuditEventId;
  readonly at: UtcInstant;
  readonly actorUid: AuthUid | null;
  readonly actorRole: Role | 'system';
  readonly action: AuditAction;
  readonly targetType: AuditTargetType;
  readonly targetId: string;
  /** Resumen de cambios sin datos personales innecesarios. */
  readonly details: Readonly<Record<string, string | number | boolean | null>>;
  readonly requestId: string | null;
  readonly previousHash: string | null;
  readonly hash: string | null;
}
