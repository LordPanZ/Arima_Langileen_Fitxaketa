/**
 * Contrato de las Cloud Functions "callable" de ARIMA FICHA.
 *
 * Fuente única de tipos para la PWA (cliente) y para functions/ (servidor).
 * Todas las funciones:
 *  1. exigen usuario autenticado con custom claim "role" y "employeeId",
 *  2. comprueban el permiso con `can()` (src/domain/auth/permissions.ts),
 *  3. validan la entrada con los validadores de este archivo,
 *  4. fijan la hora con el reloj del SERVIDOR (nunca la del cliente),
 *  5. escriben con Admin SDK + auditoría en la misma transacción (fase 2).
 *
 * Región prevista: europe-southwest1 (Madrid).
 */
import type { CorrectionKind } from '../model/correction';
import type { PunchType, BreakType } from '../model/timeEntry';
import type { ClockStatus } from '../clock/clockState';
import type { Role } from '../auth/roles';
import { ROLES } from '../auth/roles';
import { isStableId, isUtcInstant } from '../model/ids';

export const FUNCTION_NAMES = {
  getServerTime: 'getServerTime',
  getClockStatus: 'getClockStatus',
  recordPunch: 'recordPunch',
  requestTimeCorrection: 'requestTimeCorrection',
  withdrawTimeCorrection: 'withdrawTimeCorrection',
  reviewTimeCorrection: 'reviewTimeCorrection',
  setUserRole: 'setUserRole',
} as const;
export type FunctionName = (typeof FUNCTION_NAMES)[keyof typeof FUNCTION_NAMES];

// ── getServerTime ───────────────────────────────────────────────────────────
export type GetServerTimeRequest = Record<string, never>;
export interface GetServerTimeResponse {
  serverTime: string;
  timeZone: 'Europe/Madrid';
}

// ── getClockStatus ──────────────────────────────────────────────────────────
export type GetClockStatusRequest = Record<string, never>;
export interface GetClockStatusResponse {
  status: ClockStatus;
  lastPunchAt: string | null;
  openEventId: string | null;
  serverTime: string;
}

// ── recordPunch ─────────────────────────────────────────────────────────────
export interface RecordPunchRequest {
  type: PunchType;
  /** Opcional: se puede fichar sin evento. */
  eventId: string | null;
  /** Solo para pausas. */
  breakType: BreakType | null;
  /** Hora del dispositivo: informativa (detección de desfase), nunca oficial. */
  clientReportedAt: string;
  /** UUID generado por el cliente: idempotencia ante reintentos. */
  clientRequestId: string;
  note: string | null;
}
export interface RecordPunchResponse {
  entryId: string;
  /** Hora oficial (servidor). */
  recordedAt: string;
  status: ClockStatus;
  /** true si ya existía un fichaje con el mismo clientRequestId. */
  duplicate: boolean;
  /** Diferencia cliente − servidor en segundos (para avisar de relojes desajustados). */
  clientSkewSeconds: number;
}

// ── requestTimeCorrection ───────────────────────────────────────────────────
export interface RequestTimeCorrectionRequest {
  /** Solo para uno mismo; admin puede abrir en nombre de otro (fase 2). */
  employeeId: string;
  kind: CorrectionKind;
  targetEntryId: string | null;
  punchType: PunchType;
  proposedAt: string | null;
  reason: string;
  clientRequestId: string;
}
export interface RequestTimeCorrectionResponse {
  correctionId: string;
  status: 'pending';
}

// ── withdrawTimeCorrection ──────────────────────────────────────────────────
export interface WithdrawTimeCorrectionRequest {
  correctionId: string;
}

// ── reviewTimeCorrection ────────────────────────────────────────────────────
export interface ReviewTimeCorrectionRequest {
  correctionId: string;
  decision: 'approve' | 'reject';
  comment: string;
}
export interface ReviewTimeCorrectionResponse {
  correctionId: string;
  status: 'approved' | 'rejected';
  resultingEntryId: string | null;
}

// ── setUserRole ─────────────────────────────────────────────────────────────
export interface SetUserRoleRequest {
  targetUid: string;
  employeeId: string;
  role: Role;
}
export interface SetUserRoleResponse {
  targetUid: string;
  role: Role;
}

/** Códigos de error de aplicación (en `details.code` del HttpsError). */
export type AppErrorCode =
  | 'UNAUTHENTICATED'
  | 'MISSING_CLAIMS'
  | 'FORBIDDEN'
  | 'INVALID_ARGUMENT'
  | 'INVALID_TRANSITION'
  | 'CLOCKING_DISABLED'
  | 'NOT_IMPLEMENTED'
  | 'SELF_ROLE_CHANGE';

// ── Validación (pura, sin dependencias) ─────────────────────────────────────
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const PUNCH_TYPES: readonly PunchType[] = ['clock-in', 'clock-out', 'break-start', 'break-end'];
const BREAK_TYPES: readonly BreakType[] = ['rest', 'meal', 'other'];
const CORRECTION_KINDS: readonly CorrectionKind[] = ['add-missing', 'adjust-time', 'void-entry'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const LIMITS = {
  noteMaxLength: 500,
  reasonMinLength: 10,
  reasonMaxLength: 1000,
  commentMaxLength: 1000,
} as const;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function rejectUnknownKeys(
  o: Record<string, unknown>,
  allowed: readonly string[],
  errors: string[],
): void {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) errors.push(`Campo no permitido: ${k}`);
}

function optionalId(v: unknown, field: string, errors: string[]): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string' || !isStableId(v)) {
    errors.push(`${field} no válido`);
    return null;
  }
  return v;
}

function optionalText(v: unknown, field: string, max: number, errors: string[]): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'string' || v.length > max) {
    errors.push(`${field} no válido (máx. ${max} caracteres)`);
    return null;
  }
  return v.trim();
}

export function validateRecordPunch(input: unknown): ValidationResult<RecordPunchRequest> {
  const errors: string[] = [];
  if (!isObject(input)) return { ok: false, errors: ['Se esperaba un objeto'] };
  rejectUnknownKeys(
    input,
    ['type', 'eventId', 'breakType', 'clientReportedAt', 'clientRequestId', 'note'],
    errors,
  );
  const type = input['type'];
  if (!PUNCH_TYPES.includes(type as PunchType)) errors.push('type no válido');
  const isBreak = type === 'break-start' || type === 'break-end';
  const breakType = input['breakType'] ?? null;
  if (isBreak && breakType !== null && !BREAK_TYPES.includes(breakType as BreakType))
    errors.push('breakType no válido');
  if (!isBreak && breakType !== null) errors.push('breakType solo aplica a pausas');
  const clientReportedAt = input['clientReportedAt'];
  if (typeof clientReportedAt !== 'string' || !isUtcInstant(clientReportedAt))
    errors.push('clientReportedAt debe ser un instante UTC ISO-8601');
  const clientRequestId = input['clientRequestId'];
  if (typeof clientRequestId !== 'string' || !UUID_RE.test(clientRequestId))
    errors.push('clientRequestId debe ser un UUID');
  const eventId = optionalId(input['eventId'], 'eventId', errors);
  const note = optionalText(input['note'], 'note', LIMITS.noteMaxLength, errors);
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      type: type as PunchType,
      eventId,
      breakType: isBreak ? ((breakType as BreakType | null) ?? 'rest') : null,
      clientReportedAt: clientReportedAt as string,
      clientRequestId: clientRequestId as string,
      note,
    },
  };
}

export function validateRequestTimeCorrection(
  input: unknown,
): ValidationResult<RequestTimeCorrectionRequest> {
  const errors: string[] = [];
  if (!isObject(input)) return { ok: false, errors: ['Se esperaba un objeto'] };
  rejectUnknownKeys(
    input,
    ['employeeId', 'kind', 'targetEntryId', 'punchType', 'proposedAt', 'reason', 'clientRequestId'],
    errors,
  );
  const employeeId = input['employeeId'];
  if (typeof employeeId !== 'string' || !isStableId(employeeId))
    errors.push('employeeId no válido');
  const kind = input['kind'];
  if (!CORRECTION_KINDS.includes(kind as CorrectionKind)) errors.push('kind no válido');
  const punchType = input['punchType'];
  if (!PUNCH_TYPES.includes(punchType as PunchType)) errors.push('punchType no válido');
  const targetEntryId = optionalId(input['targetEntryId'], 'targetEntryId', errors);
  if ((kind === 'adjust-time' || kind === 'void-entry') && targetEntryId === null)
    errors.push('targetEntryId obligatorio para este tipo');
  if (kind === 'add-missing' && targetEntryId !== null)
    errors.push('targetEntryId no aplica a add-missing');
  const proposedAt = input['proposedAt'] ?? null;
  if (proposedAt !== null && (typeof proposedAt !== 'string' || !isUtcInstant(proposedAt)))
    errors.push('proposedAt debe ser un instante UTC');
  if (kind !== 'void-entry' && proposedAt === null)
    errors.push('proposedAt obligatorio para este tipo');
  const reason = input['reason'];
  if (
    typeof reason !== 'string' ||
    reason.trim().length < LIMITS.reasonMinLength ||
    reason.length > LIMITS.reasonMaxLength
  ) {
    errors.push(
      `reason debe tener entre ${LIMITS.reasonMinLength} y ${LIMITS.reasonMaxLength} caracteres`,
    );
  }
  const clientRequestId = input['clientRequestId'];
  if (typeof clientRequestId !== 'string' || !UUID_RE.test(clientRequestId))
    errors.push('clientRequestId debe ser un UUID');
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      employeeId: employeeId as string,
      kind: kind as CorrectionKind,
      targetEntryId,
      punchType: punchType as PunchType,
      proposedAt: proposedAt as string | null,
      reason: (reason as string).trim(),
      clientRequestId: clientRequestId as string,
    },
  };
}

export function validateReviewTimeCorrection(
  input: unknown,
): ValidationResult<ReviewTimeCorrectionRequest> {
  const errors: string[] = [];
  if (!isObject(input)) return { ok: false, errors: ['Se esperaba un objeto'] };
  rejectUnknownKeys(input, ['correctionId', 'decision', 'comment'], errors);
  const correctionId = input['correctionId'];
  if (typeof correctionId !== 'string' || !isStableId(correctionId))
    errors.push('correctionId no válido');
  const decision = input['decision'];
  if (decision !== 'approve' && decision !== 'reject') errors.push('decision no válida');
  const comment = input['comment'];
  if (
    typeof comment !== 'string' ||
    comment.trim().length === 0 ||
    comment.length > LIMITS.commentMaxLength
  ) {
    errors.push('comment obligatorio (motivo de la decisión)');
  }
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      correctionId: correctionId as string,
      decision: decision as 'approve' | 'reject',
      comment: (comment as string).trim(),
    },
  };
}

export function validateWithdrawTimeCorrection(
  input: unknown,
): ValidationResult<WithdrawTimeCorrectionRequest> {
  if (!isObject(input)) return { ok: false, errors: ['Se esperaba un objeto'] };
  const errors: string[] = [];
  rejectUnknownKeys(input, ['correctionId'], errors);
  const correctionId = input['correctionId'];
  if (typeof correctionId !== 'string' || !isStableId(correctionId))
    errors.push('correctionId no válido');
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { correctionId: correctionId as string } };
}

export function validateSetUserRole(input: unknown): ValidationResult<SetUserRoleRequest> {
  const errors: string[] = [];
  if (!isObject(input)) return { ok: false, errors: ['Se esperaba un objeto'] };
  rejectUnknownKeys(input, ['targetUid', 'employeeId', 'role'], errors);
  const targetUid = input['targetUid'];
  if (typeof targetUid !== 'string' || !isStableId(targetUid)) errors.push('targetUid no válido');
  const employeeId = input['employeeId'];
  if (typeof employeeId !== 'string' || !isStableId(employeeId))
    errors.push('employeeId no válido');
  const role = input['role'];
  if (!(ROLES as readonly unknown[]).includes(role)) errors.push('role no válido');
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: { targetUid: targetUid as string, employeeId: employeeId as string, role: role as Role },
  };
}
