import { describe, expect, it } from 'vitest';
import type { EmployeeId, EventId, UtcInstant } from '../model/ids';
import type { PunchType } from '../model/timeEntry';
import { buildWorkSessions, type Punch } from './workSessions';

const emp = 'emp-demo-01' as EmployeeId;
let n = 0;
const p = (type: PunchType, at: string, extra: Partial<Punch> = {}): Punch => ({
  id: `p${++n}`,
  employeeId: emp,
  type,
  at: at as UtcInstant,
  eventId: null,
  corrected: false,
  ...extra,
});

describe('sesiones de trabajo', () => {
  it('calcula bruto, pausas y neto', () => {
    const [s] = buildWorkSessions([
      p('clock-in', '2026-10-20T07:00:00.000Z', { eventId: 'evt-1' as EventId }),
      p('break-start', '2026-10-20T10:00:00.000Z'),
      p('break-end', '2026-10-20T10:30:00.000Z'),
      p('clock-out', '2026-10-20T15:00:00.000Z'),
    ]);
    expect(s).toMatchObject({
      localDate: '2026-10-20',
      grossMinutes: 480,
      breakMinutes: 30,
      netMinutes: 450,
      eventId: 'evt-1',
      anomalies: [],
    });
  });

  it('permite fichar sin evento', () => {
    const [s] = buildWorkSessions([
      p('clock-in', '2026-10-20T07:00:00.000Z'),
      p('clock-out', '2026-10-20T08:00:00.000Z'),
    ]);
    expect(s?.eventId).toBeNull();
    expect(s?.netMinutes).toBe(60);
  });

  it('una jornada que cruza medianoche se asigna al día de entrada (Madrid)', () => {
    const [s] = buildWorkSessions([
      p('clock-in', '2026-10-20T20:00:00.000Z'), // 22:00 Madrid
      p('clock-out', '2026-10-21T01:00:00.000Z'), // 03:00 Madrid
    ]);
    expect(s?.localDate).toBe('2026-10-20');
    expect(s?.grossMinutes).toBe(300);
  });

  it('ordena marcas desordenadas', () => {
    const sessions = buildWorkSessions([
      p('clock-out', '2026-10-20T15:00:00.000Z'),
      p('clock-in', '2026-10-20T07:00:00.000Z'),
    ]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.grossMinutes).toBe(480);
  });

  it('marca salida olvidada cuando hay una nueva entrada', () => {
    const sessions = buildWorkSessions([
      p('clock-in', '2026-10-19T07:00:00.000Z'),
      p('clock-in', '2026-10-20T07:00:00.000Z'),
      p('clock-out', '2026-10-20T15:00:00.000Z'),
    ]);
    expect(sessions[0]?.anomalies).toContain('missing-clock-out');
    expect(sessions[0]?.endAt).toBeNull();
    expect(sessions[1]?.anomalies).toEqual([]);
  });

  it('sesión abierta demasiado tiempo => salida olvidada', () => {
    const [s] = buildWorkSessions([p('clock-in', '2026-10-19T07:00:00.000Z')], {
      now: '2026-10-20T07:00:00.000Z' as UtcInstant,
    });
    expect(s?.anomalies).toContain('missing-clock-out');
  });

  it('sesión abierta reciente no es anomalía', () => {
    const [s] = buildWorkSessions([p('clock-in', '2026-10-20T07:00:00.000Z')], {
      now: '2026-10-20T09:00:00.000Z' as UtcInstant,
    });
    expect(s?.anomalies).toEqual([]);
    expect(s?.netMinutes).toBeNull();
  });

  it('propaga la marca de corrección', () => {
    const [s] = buildWorkSessions([
      p('clock-in', '2026-10-20T07:00:00.000Z'),
      p('clock-out', '2026-10-20T15:00:00.000Z', { corrected: true }),
    ]);
    expect(s?.hasCorrections).toBe(true);
  });
});
