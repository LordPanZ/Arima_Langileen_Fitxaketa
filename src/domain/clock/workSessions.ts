import type { EmployeeId, EventId, LocalDate, UtcInstant } from '../model/ids';
import type { PunchType } from '../model/timeEntry';
import { madridLocalDate, minutesBetween } from '../time/zone';

/** Marca normalizada (TimeEntry o BreakEntry ya con correcciones aplicadas). */
export interface Punch {
  readonly id: string;
  readonly employeeId: EmployeeId;
  readonly type: PunchType;
  readonly at: UtcInstant;
  readonly eventId: EventId | null;
  readonly corrected: boolean;
}

export interface BreakInterval {
  readonly startAt: UtcInstant;
  readonly endAt: UtcInstant | null;
  readonly minutes: number | null;
}

export interface WorkSession {
  readonly employeeId: EmployeeId;
  /** Día natural de Madrid en que empieza la sesión. */
  readonly localDate: LocalDate;
  readonly startAt: UtcInstant;
  readonly endAt: UtcInstant | null;
  readonly eventId: EventId | null;
  readonly breaks: readonly BreakInterval[];
  /** Minutos brutos (salida − entrada); null si sigue abierta. */
  readonly grossMinutes: number | null;
  /** Minutos de pausa cerrados. */
  readonly breakMinutes: number;
  /** Bruto − pausas. Si las pausas computan como trabajo lo decide la regla/convenio. */
  readonly netMinutes: number | null;
  readonly hasCorrections: boolean;
  /** Anomalías de secuencia detectadas al reconstruir. */
  readonly anomalies: readonly SessionAnomaly[];
}

export type SessionAnomaly =
  'missing-clock-out' | 'break-not-closed' | 'orphan-punch' | 'non-monotonic-time';

/**
 * Agrupa marcas en sesiones de trabajo. No lanza errores: las secuencias
 * incorrectas se reportan como anomalías para que generen incidencias.
 * `now` se usa solo para decidir si una sesión abierta es "anómala"
 * (más de `openSessionMaxHours` abierta).
 */
export function buildWorkSessions(
  punches: readonly Punch[],
  options: { now?: UtcInstant; openSessionMaxHours?: number } = {},
): WorkSession[] {
  const sorted = [...punches].sort(
    (a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id),
  );
  const sessions: WorkSession[] = [];
  const maxOpenMinutes = (options.openSessionMaxHours ?? 16) * 60;

  type Draft = {
    employeeId: EmployeeId;
    startAt: UtcInstant;
    eventId: EventId | null;
    breaks: { startAt: UtcInstant; endAt: UtcInstant | null }[];
    corrected: boolean;
    anomalies: Set<SessionAnomaly>;
    lastAt: UtcInstant;
  };
  let current: Draft | null = null;
  const orphanAnomalies = new Set<SessionAnomaly>();

  const close = (draft: Draft, endAt: UtcInstant | null): void => {
    const closedBreaks: BreakInterval[] = draft.breaks.map((b) => ({
      startAt: b.startAt,
      endAt: b.endAt,
      minutes: b.endAt ? minutesBetween(b.startAt, b.endAt) : null,
    }));
    if (closedBreaks.some((b) => b.endAt === null)) draft.anomalies.add('break-not-closed');
    if (endAt === null) {
      const ref = options.now ?? draft.lastAt;
      if (minutesBetween(draft.startAt, ref) > maxOpenMinutes)
        draft.anomalies.add('missing-clock-out');
    }
    const breakMinutes = closedBreaks.reduce((acc, b) => acc + (b.minutes ?? 0), 0);
    const grossMinutes = endAt ? minutesBetween(draft.startAt, endAt) : null;
    sessions.push({
      employeeId: draft.employeeId,
      localDate: madridLocalDate(draft.startAt),
      startAt: draft.startAt,
      endAt,
      eventId: draft.eventId,
      breaks: closedBreaks,
      grossMinutes,
      breakMinutes,
      netMinutes: grossMinutes === null ? null : grossMinutes - breakMinutes,
      hasCorrections: draft.corrected,
      anomalies: [...draft.anomalies],
    });
  };

  for (const p of sorted) {
    if (current && Date.parse(p.at) < Date.parse(current.lastAt))
      current.anomalies.add('non-monotonic-time');
    switch (p.type) {
      case 'clock-in':
        if (current) {
          // Entrada sin salida previa: se cierra la anterior como incompleta.
          current.anomalies.add('missing-clock-out');
          close(current, null);
        }
        current = {
          employeeId: p.employeeId,
          startAt: p.at,
          eventId: p.eventId,
          breaks: [],
          corrected: p.corrected,
          anomalies: new Set(),
          lastAt: p.at,
        };
        break;
      case 'break-start':
        if (!current) {
          orphanAnomalies.add('orphan-punch');
          break;
        }
        if (current.breaks.some((b) => b.endAt === null)) current.anomalies.add('orphan-punch');
        else current.breaks.push({ startAt: p.at, endAt: null });
        break;
      case 'break-end': {
        const open = current?.breaks.find((b) => b.endAt === null);
        if (!current || !open) {
          if (current) current.anomalies.add('orphan-punch');
          else orphanAnomalies.add('orphan-punch');
          break;
        }
        open.endAt = p.at;
        break;
      }
      case 'clock-out':
        if (!current) {
          orphanAnomalies.add('orphan-punch');
          break;
        }
        current.corrected ||= p.corrected;
        current.lastAt = p.at;
        close(current, p.at);
        current = null;
        continue;
    }
    if (current) {
      current.corrected ||= p.corrected;
      current.lastAt = p.at;
    }
  }
  if (current) close(current, null);
  void orphanAnomalies; // Se exponen en fase 2 como incidencias independientes.
  return sessions;
}
