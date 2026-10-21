import { describe, expect, it } from 'vitest';
import { buildWorkSessions } from '../../domain/clock/workSessions';
import type { UtcInstant } from '../../domain/model';
import { buildDemoDataset, DEMO_EMPLOYEES } from './demoData';
import { createDemoDataSource } from './demoDataSource';

const NOW = new Date('2026-10-21T10:00:00.000Z');

describe('datos de demostración', () => {
  const data = buildDemoDataset(NOW);

  it('todo está marcado como demo y los correos usan un dominio inexistente', () => {
    const all = [
      ...data.employees,
      ...data.events,
      ...data.assignments,
      ...data.corrections,
      ...data.incidents,
    ];
    expect(all.every((x) => x.isDemo)).toBe(true);
    expect(
      DEMO_EMPLOYEES.every((e) => e.email.endsWith('.invalid') && e.displayName.includes('(DEMO)')),
    ).toBe(true);
  });

  it('todas las fechas están en UTC canónico', () => {
    for (const t of data.timeEntries)
      expect(t.recordedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/);
  });

  it('incluye un fichaje sin evento y una salida olvidada', async () => {
    const ds = createDemoDataSource(() => NOW);
    const sessions = buildWorkSessions(await ds.listPunches('emp-demo-ane'), {
      now: NOW.toISOString() as UtcInstant,
    });
    expect(sessions.some((s) => s.eventId === null && s.endAt !== null)).toBe(true);
    expect(sessions.some((s) => s.anomalies.includes('missing-clock-out'))).toBe(true);
  });

  it('las asignaciones usan el ID determinista que esperan las reglas', () => {
    for (const a of data.assignments) expect(a.id).toBe(`${a.eventId}__${a.employeeId}`);
  });
});
