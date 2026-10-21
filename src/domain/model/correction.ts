import type {
  AuthUid,
  BreakEntryId,
  EmployeeId,
  TimeCorrectionId,
  TimeEntryId,
  UtcInstant,
} from './ids';
import type { PunchType } from './timeEntry';

export type CorrectionKind =
  /** Falta una marca (p. ej. olvidó fichar la salida). */
  | 'add-missing'
  /** La hora de una marca existente no es correcta. */
  | 'adjust-time'
  /** Una marca no debió existir (p. ej. doble pulsación). */
  | 'void-entry';

export type CorrectionStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

/**
 * Solicitud de corrección. El registro original NUNCA se modifica: si se
 * aprueba, se crea un registro nuevo con source = "correction" y la vista
 * calculada aplica la corrección, conservando ambos para auditoría.
 */
export interface TimeCorrection {
  readonly id: TimeCorrectionId;
  readonly employeeId: EmployeeId;
  readonly kind: CorrectionKind;
  /** Registro afectado (null para "add-missing"). */
  readonly targetEntryId: TimeEntryId | BreakEntryId | null;
  readonly punchType: PunchType;
  /** Hora propuesta en UTC (la UI la introduce en hora de Madrid). */
  readonly proposedAt: UtcInstant | null;
  readonly reason: string;
  readonly requestedByUid: AuthUid;
  readonly requestedAt: UtcInstant;
  readonly status: CorrectionStatus;
  readonly reviewedByUid: AuthUid | null;
  readonly reviewedAt: UtcInstant | null;
  readonly reviewComment: string | null;
  /** Registro creado al aprobar. */
  readonly resultingEntryId: TimeEntryId | BreakEntryId | null;
  readonly isDemo: boolean;
}
