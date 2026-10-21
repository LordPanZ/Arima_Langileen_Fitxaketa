import { describe, expect, it } from 'vitest';
import type { EmployeeId, LaborRuleId, LocalDate, UtcInstant } from '../model/ids';
import type { LaborRule } from '../model/laborRule';
import { buildWorkSessions, type Punch } from '../clock/workSessions';
import { DEFAULT_LABOR_RULES } from './defaultRules';
import { evaluateRules } from './evaluateRules';

const emp = 'emp-demo-01' as EmployeeId;
let n = 0;
const p = (type: Punch['type'], at: string): Punch => ({
  id: `p${++n}`,
  employeeId: emp,
  type,
  at: at as UtcInstant,
  eventId: null,
  corrected: false,
});

describe('evaluación de reglas de jornada', () => {
  it('avisa al superar 9 h diarias (provisional: pendiente de revisión)', () => {
    const sessions = buildWorkSessions([
      p('clock-in', '2026-10-20T06:00:00.000Z'),
      p('break-start', '2026-10-20T10:00:00.000Z'),
      p('break-end', '2026-10-20T10:30:00.000Z'),
      p('clock-out', '2026-10-20T16:00:00.000Z'),
    ]);
    const f = evaluateRules(sessions, DEFAULT_LABOR_RULES);
    const daily = f.find((x) => x.code === 'MAX_DAILY_ORDINARY_HOURS');
    expect(daily).toMatchObject({
      localDate: '2026-10-20',
      provisional: true,
      values: { minutes: 570, limit: 540 },
    });
  });

  it('suma varias sesiones del mismo día (jornada partida)', () => {
    const sessions = buildWorkSessions([
      p('clock-in', '2026-10-20T06:00:00.000Z'),
      p('clock-out', '2026-10-20T11:00:00.000Z'),
      p('clock-in', '2026-10-20T13:00:00.000Z'),
      p('clock-out', '2026-10-20T18:00:00.000Z'),
    ]);
    const codes = evaluateRules(sessions, DEFAULT_LABOR_RULES).map((x) => x.code);
    expect(codes).toContain('MAX_DAILY_ORDINARY_HOURS');
    // Jornada partida el mismo día: no es un "descanso entre jornadas".
    expect(codes).not.toContain('MIN_REST_BETWEEN_WORKDAYS');
  });

  it('avisa si el descanso entre jornadas es menor de 12 h', () => {
    const sessions = buildWorkSessions([
      p('clock-in', '2026-10-20T14:00:00.000Z'),
      p('clock-out', '2026-10-20T21:00:00.000Z'), // 23:00 Madrid
      p('clock-in', '2026-10-21T05:00:00.000Z'), // 07:00 Madrid → 8 h de descanso
      p('clock-out', '2026-10-21T10:00:00.000Z'),
    ]);
    const rest = evaluateRules(sessions, DEFAULT_LABOR_RULES).find(
      (x) => x.code === 'MIN_REST_BETWEEN_WORKDAYS',
    );
    expect(rest?.values).toEqual({ minutes: 480, limit: 720 });
  });

  it('avisa si más de 6 h seguidas sin pausa de 15 min', () => {
    const sessions = buildWorkSessions([
      p('clock-in', '2026-10-20T06:00:00.000Z'),
      p('clock-out', '2026-10-20T13:00:00.000Z'),
    ]);
    const codes = evaluateRules(sessions, DEFAULT_LABOR_RULES).map((x) => x.code);
    expect(codes).toContain('BREAK_AFTER_CONTINUOUS_WORK');
  });

  it('no avisa si hubo pausa suficiente', () => {
    const sessions = buildWorkSessions([
      p('clock-in', '2026-10-20T06:00:00.000Z'),
      p('break-start', '2026-10-20T09:00:00.000Z'),
      p('break-end', '2026-10-20T09:20:00.000Z'),
      p('clock-out', '2026-10-20T13:00:00.000Z'),
    ]);
    expect(evaluateRules(sessions, DEFAULT_LABOR_RULES)).toEqual([]);
  });

  it('las reglas son configurables y respetan vigencia y estado', () => {
    const custom: LaborRule = {
      id: 'r1' as LaborRuleId,
      code: 'MAX_DAILY_ORDINARY_HOURS',
      params: { maxMinutes: 60 },
      status: 'active',
      source: 'collective-agreement',
      legalBasis: 'Convenio (ficticio)',
      severity: 'warning',
      validFrom: '2026-10-21' as LocalDate,
      validTo: null,
      notes: null,
    };
    const sessions = buildWorkSessions([
      p('clock-in', '2026-10-20T06:00:00.000Z'),
      p('clock-out', '2026-10-20T08:00:00.000Z'),
      p('clock-in', '2026-10-21T06:00:00.000Z'),
      p('clock-out', '2026-10-21T08:00:00.000Z'),
    ]);
    const f = evaluateRules(sessions, [custom]);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ localDate: '2026-10-21', provisional: false });
    expect(evaluateRules(sessions, [{ ...custom, status: 'retired' }])).toEqual([]);
  });

  it('todas las reglas por defecto están pendientes de validación legal', () => {
    for (const r of DEFAULT_LABOR_RULES)
      expect(['draft', 'pending-legal-review']).toContain(r.status);
  });
});
