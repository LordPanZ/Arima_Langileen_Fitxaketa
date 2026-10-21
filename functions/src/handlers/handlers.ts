import {
  validateRecordPunch,
  validateRequestTimeCorrection,
  validateReviewTimeCorrection,
  validateSetUserRole,
  validateWithdrawTimeCorrection,
  type GetServerTimeResponse,
  type RecordPunchResponse,
  type RequestTimeCorrectionResponse,
  type ReviewTimeCorrectionResponse,
  type SetUserRoleResponse,
  type ValidationResult,
} from '../../../src/domain/contracts/functionsApi';
import type { UtcInstant } from '../../../src/domain/model/ids';
import { type AuthLike, requirePermission, resolveCaller } from '../caller';
import type { HandlerDeps } from '../deps';
import { AppError } from '../errors';

function unwrap<T>(r: ValidationResult<T>): T {
  if (!r.ok) throw new AppError('INVALID_ARGUMENT', 'Datos no válidos', r.errors);
  return r.value;
}

const notImplemented = (what: string): never => {
  throw new AppError('NOT_IMPLEMENTED', `${what}: pendiente de fase 2`);
};

export async function getServerTime(
  auth: AuthLike | undefined,
  _data: unknown,
  deps: HandlerDeps,
): Promise<GetServerTimeResponse> {
  resolveCaller(auth);
  return { serverTime: deps.now().toISOString(), timeZone: 'Europe/Madrid' };
}

export async function getClockStatus(
  auth: AuthLike | undefined,
  _data: unknown,
  _deps: HandlerDeps,
): Promise<never> {
  const caller = resolveCaller(auth);
  requirePermission(caller, 'clock:self');
  return notImplemented('getClockStatus');
}

/**
 * Registro de fichaje. Orden de comprobaciones (fase 2 completará los pasos 5–8):
 *  1. autenticación y claims  2. permiso clock:self  3. validación de entrada
 *  4. interruptor CLOCKING_ENABLED
 *  5. idempotencia por clientRequestId  6. transición de estado válida
 *  7. escribir TimeEntry/BreakEntry con recordedAt = hora del servidor
 *  8. AuditEvent en la misma transacción
 */
export async function recordPunch(
  auth: AuthLike | undefined,
  data: unknown,
  deps: HandlerDeps,
): Promise<RecordPunchResponse> {
  const caller = resolveCaller(auth);
  requirePermission(caller, 'clock:self');
  unwrap(validateRecordPunch(data));
  if (!deps.clockingEnabled()) {
    throw new AppError('CLOCKING_DISABLED', 'El registro de fichajes no está activo (fase 1)');
  }
  return notImplemented('recordPunch');
}

export async function requestTimeCorrection(
  auth: AuthLike | undefined,
  data: unknown,
  _deps: HandlerDeps,
): Promise<RequestTimeCorrectionResponse> {
  const caller = resolveCaller(auth);
  requirePermission(caller, 'correction:request-self');
  const input = unwrap(validateRequestTimeCorrection(data));
  if (input.employeeId !== caller.employeeId) {
    throw new AppError('FORBIDDEN', 'Solo puedes solicitar correcciones de tus propios registros');
  }
  return notImplemented('requestTimeCorrection');
}

export async function withdrawTimeCorrection(
  auth: AuthLike | undefined,
  data: unknown,
  _deps: HandlerDeps,
): Promise<never> {
  const caller = resolveCaller(auth);
  requirePermission(caller, 'correction:withdraw-self');
  unwrap(validateWithdrawTimeCorrection(data));
  // Fase 2: comprobar que la corrección es del llamante y sigue "pending".
  return notImplemented('withdrawTimeCorrection');
}

export async function reviewTimeCorrection(
  auth: AuthLike | undefined,
  data: unknown,
  _deps: HandlerDeps,
): Promise<ReviewTimeCorrectionResponse> {
  const caller = resolveCaller(auth);
  requirePermission(caller, 'correction:review');
  unwrap(validateReviewTimeCorrection(data));
  // Fase 2: impedir que alguien revise su propia solicitud.
  return notImplemented('reviewTimeCorrection');
}

/** Asigna rol (custom claims). Implementado: lo necesitan emuladores y alta de usuarios. */
export async function setUserRole(
  auth: AuthLike | undefined,
  data: unknown,
  deps: HandlerDeps,
): Promise<SetUserRoleResponse> {
  const caller = resolveCaller(auth);
  requirePermission(caller, 'roles:assign');
  const input = unwrap(validateSetUserRole(data));
  if (input.targetUid === caller.uid) {
    throw new AppError('SELF_ROLE_CHANGE', 'Nadie puede cambiar su propio rol');
  }
  await deps.setRoleClaims(input.targetUid, { role: input.role, employeeId: input.employeeId });
  await deps.writeAudit({
    at: deps.now().toISOString() as UtcInstant,
    actorUid: caller.uid as never,
    actorRole: caller.role,
    action: 'auth.role-changed',
    targetType: 'employee',
    targetId: input.employeeId,
    details: { targetUid: input.targetUid, newRole: input.role },
    requestId: null,
  });
  return { targetUid: input.targetUid, role: input.role };
}
