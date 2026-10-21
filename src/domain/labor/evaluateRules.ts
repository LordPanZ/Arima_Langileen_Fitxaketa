import type { LaborRule } from '../model/laborRule';
import type { LocalDate } from '../model/ids';
import { minutesBetween } from '../time/zone';
import type { WorkSession } from '../clock/workSessions';

export interface RuleFinding {
  readonly ruleId: LaborRule['id'];
  readonly code: LaborRule['code'];
  readonly severity: LaborRule['severity'];
  /** true si la regla no está validada (borrador o pendiente de revisión legal). */
  readonly provisional: boolean;
  readonly localDate: LocalDate;
  /** Clave i18n del mensaje + valores. */
  readonly messageKey: string;
  readonly values: Readonly<Record<string, number | string>>;
}

function isApplicable(rule: LaborRule, date: LocalDate): boolean {
  if (rule.status === 'retired') return false;
  if (date < rule.validFrom) return false;
  if (rule.validTo && date > rule.validTo) return false;
  return true;
}

/**
 * Evalúa reglas de jornada sobre las sesiones de UN trabajador.
 * Resultado: avisos para revisión humana. Nunca bloquea fichajes.
 * Las reglas "MIN_WEEKLY_REST" y "MAX_WEEKLY_AVERAGE_HOURS" requieren
 * definir el periodo de cómputo según convenio: se evalúan en fase 2.
 */
export function evaluateRules(
  sessions: readonly WorkSession[],
  rules: readonly LaborRule[],
): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const closed = sessions
    .filter((s) => s.endAt !== null)
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));

  // Minutos netos por día natural de Madrid.
  const netByDay = new Map<LocalDate, number>();
  for (const s of closed)
    netByDay.set(s.localDate, (netByDay.get(s.localDate) ?? 0) + (s.netMinutes ?? 0));

  for (const rule of rules) {
    const base = (localDate: LocalDate) => ({
      ruleId: rule.id,
      code: rule.code,
      severity: rule.severity,
      provisional: rule.status !== 'active',
      localDate,
    });
    switch (rule.code) {
      case 'MAX_DAILY_ORDINARY_HOURS':
        for (const [day, minutes] of netByDay) {
          if (isApplicable(rule, day) && minutes > rule.params.maxMinutes) {
            findings.push({
              ...base(day),
              messageKey: 'rules.findings.maxDaily',
              values: { minutes, limit: rule.params.maxMinutes },
            });
          }
        }
        break;
      case 'MIN_REST_BETWEEN_WORKDAYS':
        for (let i = 1; i < closed.length; i++) {
          const prev = closed[i - 1];
          const cur = closed[i];
          if (!prev || !cur || !prev.endAt) continue;
          // Solo entre jornadas de días distintos: varias sesiones el mismo
          // día (jornada partida) no son "descanso entre jornadas".
          if (prev.localDate === cur.localDate) continue;
          const rest = minutesBetween(prev.endAt, cur.startAt);
          if (isApplicable(rule, cur.localDate) && rest < rule.params.minMinutes) {
            findings.push({
              ...base(cur.localDate),
              messageKey: 'rules.findings.minRest',
              values: { minutes: rest, limit: rule.params.minMinutes },
            });
          }
        }
        break;
      case 'BREAK_AFTER_CONTINUOUS_WORK':
        for (const s of closed) {
          if (!isApplicable(rule, s.localDate) || !s.endAt) continue;
          const longest = longestContinuousStretch(s);
          const tookLongEnoughBreak = s.breaks.some(
            (b) => (b.minutes ?? 0) >= rule.params.minBreakMinutes,
          );
          if (longest > rule.params.continuousWorkMinutes && !tookLongEnoughBreak) {
            findings.push({
              ...base(s.localDate),
              messageKey: 'rules.findings.breakMissing',
              values: {
                minutes: longest,
                limit: rule.params.continuousWorkMinutes,
                minBreak: rule.params.minBreakMinutes,
              },
            });
          }
        }
        break;
      case 'MIN_WEEKLY_REST':
      case 'MAX_WEEKLY_AVERAGE_HOURS':
        break;
    }
  }
  return findings;
}

/** Tramo más largo de trabajo sin pausa dentro de una sesión cerrada. */
export function longestContinuousStretch(session: WorkSession): number {
  if (!session.endAt) return 0;
  const points = [session.startAt];
  const ends = [];
  for (const b of session.breaks) {
    if (!b.endAt) continue;
    ends.push(b.startAt);
    points.push(b.endAt);
  }
  ends.push(session.endAt);
  let longest = 0;
  for (let i = 0; i < points.length; i++) {
    const start = points[i];
    const end = ends[i];
    if (start && end) longest = Math.max(longest, minutesBetween(start, end));
  }
  return longest;
}
