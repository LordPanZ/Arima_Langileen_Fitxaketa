import type { AuditEvent } from '../../src/domain/model/audit';
import type { Role } from '../../src/domain/auth/roles';

/** Dependencias inyectables: permiten probar handlers sin emuladores. */
export interface HandlerDeps {
  /** Reloj del servidor. Es la referencia horaria oficial. */
  now(): Date;
  /** Fase 1: false. Activarlo requiere completar y probar la fase 2. */
  clockingEnabled(): boolean;
  setRoleClaims(uid: string, claims: { role: Role; employeeId: string }): Promise<void>;
  writeAudit(event: Omit<AuditEvent, 'id' | 'hash' | 'previousHash'>): Promise<void>;
}
