import type {
  AuthUid,
  BreakEntryId,
  EmployeeId,
  EventId,
  TimeCorrectionId,
  TimeEntryId,
  UtcInstant,
} from './ids';

/**
 * Origen del registro.
 * - online: el servidor fija la hora (recordedAt = hora del servidor).
 * - offline-sync: capturado sin conexión y sincronizado después (fase 2+;
 *   siempre marcado y con ambas horas, ver ARCHITECTURE.md).
 * - correction: creado al aprobar una TimeCorrection. Nunca sobrescribe.
 */
export type EntrySource = 'online' | 'offline-sync' | 'correction';

/** Campos comunes de integridad de todo registro legal (append-only). */
export interface LegalRecordIntegrity {
  /** Hora oficial: la del servidor en el momento de recibirlo. */
  readonly recordedAt: UtcInstant;
  /** Hora declarada por el dispositivo (informativa, nunca la oficial online). */
  readonly clientReportedAt: UtcInstant | null;
  /** Clave de idempotencia generada en el cliente (evita dobles fichajes). */
  readonly clientRequestId: string;
  readonly source: EntrySource;
  /** Número de secuencia por trabajador (monótono, sin huecos). */
  readonly sequence: number;
  /** Hash SHA-256 del registro anterior del trabajador (cadena). Fase 2. */
  readonly previousHash: string | null;
  /** Hash SHA-256 del contenido canónico de este registro. Fase 2. */
  readonly hash: string | null;
  /** Quién lo creó (el propio trabajador o, en correcciones, el revisor). */
  readonly createdByUid: AuthUid;
  /** Si procede de una corrección aprobada, cuál. */
  readonly correctionId: TimeCorrectionId | null;
}

export type TimeEntryType = 'clock-in' | 'clock-out';

/** Marca de inicio o fin de jornada. Inmutable una vez escrita. */
export interface TimeEntry extends LegalRecordIntegrity {
  readonly id: TimeEntryId;
  readonly employeeId: EmployeeId;
  readonly type: TimeEntryType;
  /** Opcional: se puede fichar sin evento asignado. */
  readonly eventId: EventId | null;
  readonly note: string | null;
}

export type BreakType = 'rest' | 'meal' | 'other';
export type BreakEntryType = 'break-start' | 'break-end';

/** Marca de inicio o fin de pausa. Inmutable una vez escrita. */
export interface BreakEntry extends LegalRecordIntegrity {
  readonly id: BreakEntryId;
  readonly employeeId: EmployeeId;
  readonly type: BreakEntryType;
  readonly breakType: BreakType;
  /**
   * Si la pausa computa como tiempo de trabajo efectivo. Depende del convenio
   * colectivo o del contrato: hasta conocerlo es "pending-agreement".
   */
  readonly countsAsWorkTime: boolean | 'pending-agreement';
}

export type PunchType = TimeEntryType | BreakEntryType;
