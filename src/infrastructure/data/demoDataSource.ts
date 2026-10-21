import type { Punch } from '../../domain/clock/workSessions';
import { DEFAULT_LABOR_RULES } from '../../domain/labor/defaultRules';
import type { BreakEntry, TimeEntry } from '../../domain/model';
import { buildDemoDataset, type DemoDataset } from './demoData';
import type { DataSource } from './types';

function toPunch(e: TimeEntry | BreakEntry): Punch {
  return {
    id: e.id,
    employeeId: e.employeeId,
    type: e.type,
    at: e.recordedAt,
    eventId: 'eventId' in e ? e.eventId : null,
    corrected: e.source === 'correction',
  };
}

export function createDemoDataSource(now: () => Date = () => new Date()): DataSource {
  let cache: DemoDataset | null = null;
  const data = () => (cache ??= buildDemoDataset(now()));
  const punches = () => [...data().timeEntries, ...data().breakEntries].map(toPunch);

  return {
    isDemo: true,
    getEmployee: async (id) => data().employees.find((e) => e.id === id) ?? null,
    listEmployees: async () => data().employees,
    listEvents: async () => [...data().events].sort((a, b) => a.startAt.localeCompare(b.startAt)),
    listAssignmentsForEmployee: async (employeeId) =>
      data().assignments.filter((a) => a.employeeId === employeeId),
    listAssignmentsForEvent: async (eventId) =>
      data().assignments.filter((a) => a.eventId === eventId),
    listPunches: async (employeeId) => punches().filter((p) => p.employeeId === employeeId),
    listAllPunches: async () => punches(),
    listCorrections: async (employeeId) =>
      data().corrections.filter((c) => !employeeId || c.employeeId === employeeId),
    listIncidents: async () =>
      [...data().incidents].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt)),
    listLaborRules: async () => DEFAULT_LABOR_RULES,
  };
}
