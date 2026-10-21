/**
 * Identificadores estables y tipos de fecha.
 *
 * - Los IDs son cadenas opacas (IDs de documento Firestore o UUID v4) que no
 *   cambian nunca, aunque cambien nombre, correo o cuenta de acceso.
 * - Los instantes se guardan SIEMPRE en UTC (ISO-8601 con sufijo "Z" en el
 *   dominio; Timestamp en Firestore). La zona Europe/Madrid solo se usa para
 *   presentar y para calcular "días naturales" de la jornada.
 */

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type EmployeeId = Brand<string, 'EmployeeId'>;
export type AuthUid = Brand<string, 'AuthUid'>;
export type ContractId = Brand<string, 'ContractId'>;
export type WorkScheduleId = Brand<string, 'WorkScheduleId'>;
export type EventId = Brand<string, 'EventId'>;
export type EventAssignmentId = Brand<string, 'EventAssignmentId'>;
export type TimeEntryId = Brand<string, 'TimeEntryId'>;
export type BreakEntryId = Brand<string, 'BreakEntryId'>;
export type TimeCorrectionId = Brand<string, 'TimeCorrectionId'>;
export type IncidentId = Brand<string, 'IncidentId'>;
export type AuditEventId = Brand<string, 'AuditEventId'>;
export type LaborRuleId = Brand<string, 'LaborRuleId'>;

/** Instante en UTC, ISO-8601 con milisegundos y sufijo Z: 2026-10-21T08:00:00.000Z */
export type UtcInstant = Brand<string, 'UtcInstant'>;

/** Fecha de calendario en Europe/Madrid (sin hora): 2026-10-21 */
export type LocalDate = Brand<string, 'LocalDate'>;

/** Zona horaria de referencia de la empresa. */
export const COMPANY_TIME_ZONE = 'Europe/Madrid' as const;
export type CompanyTimeZone = typeof COMPANY_TIME_ZONE;

const UTC_INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const LOCAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

export function isUtcInstant(value: string): value is UtcInstant {
  return UTC_INSTANT_RE.test(value) && !Number.isNaN(Date.parse(value));
}

export function isLocalDate(value: string): value is LocalDate {
  if (!LOCAL_DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

/** Valida que un ID sea seguro como ID de documento (sin "/", sin espacios). */
export function isStableId(value: string): boolean {
  return ID_RE.test(value) && value !== '.' && value !== '..' && !value.startsWith('__');
}

export function asId<T extends string & { readonly [brand]: string }>(value: string): T {
  if (!isStableId(value)) throw new Error(`Identificador no válido: "${value}"`);
  return value as T;
}
