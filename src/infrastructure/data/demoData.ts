/**
 * DATOS DE DEMOSTRACIÓN — 100 % FICTICIOS.
 *
 * Ningún nombre, correo o dato corresponde a personas reales. Los correos usan
 * el dominio reservado ".invalid" (RFC 2606), que no puede existir.
 * Todos los objetos llevan isDemo: true y la UI los marca como "DEMO".
 */
import type { Role } from '../../domain/auth/roles';
import type {
  AuthUid,
  BreakEntry,
  BreakEntryId,
  Employee,
  EmployeeId,
  Event,
  EventAssignment,
  EventId,
  Incident,
  IncidentId,
  LocalDate,
  TimeCorrection,
  TimeCorrectionId,
  TimeEntry,
  TimeEntryId,
  UtcInstant,
} from '../../domain/model';
import { eventAssignmentId } from '../../domain/model/event';
import { madridLocalDate, madridWallTimeToUtc } from '../../domain/time/zone';

const CREATED = '2026-01-01T08:00:00.000Z' as UtcInstant;

function demoEmployee(
  id: string,
  code: string,
  displayName: string,
  role: Role,
  locale: 'es' | 'eu',
): Employee {
  return {
    id: id as EmployeeId,
    authUid: null,
    employeeCode: code,
    displayName,
    email: `${id.replace('emp-demo-', '')}@demo.arima-ficha.invalid`,
    role,
    preferredLocale: locale,
    status: 'active',
    createdAt: CREATED,
    updatedAt: CREATED,
    isDemo: true,
  };
}

export const DEMO_EMPLOYEES: readonly Employee[] = [
  demoEmployee('emp-demo-ane', 'DEMO-01', 'Ane Proba (DEMO)', 'employee', 'eu'),
  demoEmployee('emp-demo-iker', 'DEMO-02', 'Iker Adibide (DEMO)', 'coordinator', 'eu'),
  demoEmployee('emp-demo-miren', 'DEMO-03', 'Miren Saiakera (DEMO)', 'admin', 'es'),
  demoEmployee('emp-demo-jon', 'DEMO-04', 'Jon Ikuskari (DEMO)', 'auditor', 'es'),
  demoEmployee('emp-demo-lucia', 'DEMO-05', 'Lucía Ejemplo (DEMO)', 'employee', 'es'),
  demoEmployee('emp-demo-unai', 'DEMO-06', 'Unai Ficticio (DEMO)', 'employee', 'eu'),
];

const byId = (id: string): Employee => {
  const e = DEMO_EMPLOYEES.find((x) => x.id === id);
  if (!e) throw new Error(id);
  return e;
};

export const DEMO_USERS_BY_ROLE: Readonly<Record<Role, Employee>> = {
  employee: byId('emp-demo-ane'),
  coordinator: byId('emp-demo-iker'),
  admin: byId('emp-demo-miren'),
  auditor: byId('emp-demo-jon'),
};

export interface DemoDataset {
  employees: readonly Employee[];
  events: readonly Event[];
  assignments: readonly EventAssignment[];
  timeEntries: readonly TimeEntry[];
  breakEntries: readonly BreakEntry[];
  corrections: readonly TimeCorrection[];
  incidents: readonly Incident[];
}

function addDays(date: LocalDate, days: number): LocalDate {
  const d = new Date(`${date}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10) as LocalDate;
}

/**
 * Genera el conjunto de datos de demostración relativo a `now`, para que
 * siempre haya actividad "reciente" y eventos "próximos".
 */
export function buildDemoDataset(now: Date): DemoDataset {
  const today = madridLocalDate(now.toISOString() as UtcInstant);
  const at = (dayOffset: number, hhmm: string) =>
    madridWallTimeToUtc(addDays(today, dayOffset), hhmm, { prefer: 'earlier' });

  const ev = (
    id: string,
    code: string,
    name: string,
    location: string,
    day: number,
    from: string,
    to: string,
    status: Event['status'],
  ): Event => ({
    id: id as EventId,
    code,
    name,
    description: 'Actividad ficticia para demostración / Erakusketarako jarduera fiktizioa',
    locationLabel: location,
    startAt: at(day, from),
    endAt: at(day, to),
    status,
    coordinatorIds: ['emp-demo-iker' as EmployeeId],
    isDemo: true,
  });

  const events: Event[] = [
    ev(
      'evt-demo-001',
      'DEMO-TOUR-01',
      'Tour demo: Parte Vieja',
      'Donostia (ficticio)',
      -2,
      '09:30',
      '13:30',
      'finished',
    ),
    ev(
      'evt-demo-002',
      'DEMO-KAYAK-02',
      'Actividad demo: kayak',
      'Costa (ficticio)',
      0,
      '10:00',
      '14:00',
      'scheduled',
    ),
    ev(
      'evt-demo-003',
      'DEMO-GASTRO-03',
      'Ruta demo de pintxos',
      'Bilbo (ficticio)',
      2,
      '18:00',
      '22:00',
      'scheduled',
    ),
    ev(
      'evt-demo-004',
      'DEMO-CAMP-04',
      'Campamento demo',
      'Monte (ficticio)',
      6,
      '08:00',
      '18:00',
      'draft',
    ),
  ];

  const asg = (
    eventId: string,
    employeeId: string,
    task: string,
    status: EventAssignment['status'],
  ): EventAssignment => {
    const e = events.find((x) => x.id === eventId) as Event;
    return {
      id: eventAssignmentId(e.id, employeeId as EmployeeId),
      eventId: e.id,
      employeeId: employeeId as EmployeeId,
      task,
      plannedStartAt: e.startAt,
      plannedEndAt: e.endAt,
      status,
      isDemo: true,
    };
  };

  const assignments: EventAssignment[] = [
    asg('evt-demo-001', 'emp-demo-ane', 'Guía', 'confirmed'),
    asg('evt-demo-001', 'emp-demo-lucia', 'Apoyo', 'confirmed'),
    asg('evt-demo-002', 'emp-demo-ane', 'Monitora', 'confirmed'),
    asg('evt-demo-002', 'emp-demo-unai', 'Monitor', 'assigned'),
    asg('evt-demo-003', 'emp-demo-ane', 'Guía', 'assigned'),
    asg('evt-demo-003', 'emp-demo-iker', 'Coordinación', 'confirmed'),
    asg('evt-demo-004', 'emp-demo-unai', 'Monitor', 'assigned'),
  ];

  const timeEntries: TimeEntry[] = [];
  const breakEntries: BreakEntry[] = [];
  let seq = 0;
  const integrity = (recordedAt: UtcInstant) => ({
    recordedAt,
    clientReportedAt: recordedAt,
    clientRequestId: `demo-req-${++seq}`,
    source: 'online' as const,
    sequence: seq,
    previousHash: null,
    hash: null,
    createdByUid: 'demo-uid' as AuthUid,
    correctionId: null,
  });
  const work = (
    employeeId: string,
    day: number,
    from: string,
    to: string | null,
    eventId: string | null,
    brk?: [string, string],
  ) => {
    const emp = employeeId as EmployeeId;
    const evId = eventId as EventId | null;
    timeEntries.push({
      id: `te-demo-${seq + 1}` as TimeEntryId,
      employeeId: emp,
      type: 'clock-in',
      eventId: evId,
      note: null,
      ...integrity(at(day, from)),
    });
    if (brk) {
      breakEntries.push({
        id: `be-demo-${seq + 1}` as BreakEntryId,
        employeeId: emp,
        type: 'break-start',
        breakType: 'meal',
        countsAsWorkTime: 'pending-agreement',
        ...integrity(at(day, brk[0])),
      });
      breakEntries.push({
        id: `be-demo-${seq + 1}` as BreakEntryId,
        employeeId: emp,
        type: 'break-end',
        breakType: 'meal',
        countsAsWorkTime: 'pending-agreement',
        ...integrity(at(day, brk[1])),
      });
    }
    if (to)
      timeEntries.push({
        id: `te-demo-${seq + 1}` as TimeEntryId,
        employeeId: emp,
        type: 'clock-out',
        eventId: evId,
        note: null,
        ...integrity(at(day, to)),
      });
  };

  // Ane (perfil "trabajador" de la demo)
  work('emp-demo-ane', -5, '08:00', '14:00', null);
  work('emp-demo-ane', -4, '09:00', '17:30', null, ['13:00', '13:45']);
  work('emp-demo-ane', -3, '16:00', null, null); // salida olvidada → incidencia + corrección
  work('emp-demo-ane', -2, '09:00', '13:45', 'evt-demo-001');
  work('emp-demo-ane', -1, '07:30', '16:15', null);
  // Resto de la plantilla ficticia
  work('emp-demo-lucia', -2, '09:00', '14:00', 'evt-demo-001');
  work('emp-demo-unai', -1, '15:00', '23:30', null);
  work('emp-demo-iker', -1, '08:30', '16:00', null, ['12:30', '13:00']);

  const forgotten = timeEntries.find(
    (t) => t.employeeId === 'emp-demo-ane' && t.recordedAt === at(-3, '16:00'),
  ) as TimeEntry;

  const corrections: TimeCorrection[] = [
    {
      id: 'tc-demo-001' as TimeCorrectionId,
      employeeId: 'emp-demo-ane' as EmployeeId,
      kind: 'add-missing',
      targetEntryId: null,
      punchType: 'clock-out',
      proposedAt: at(-3, '20:00'),
      reason:
        'DEMO: olvidé fichar la salida al terminar / DEMO: irteera fitxatzea ahaztu zitzaidan',
      requestedByUid: 'demo-uid-emp-demo-ane' as AuthUid,
      requestedAt: at(-2, '08:50'),
      status: 'pending',
      reviewedByUid: null,
      reviewedAt: null,
      reviewComment: null,
      resultingEntryId: null,
      isDemo: true,
    },
  ];

  const incidents: Incident[] = [
    {
      id: 'inc-demo-001' as IncidentId,
      type: 'missing-clock-out',
      severity: 'warning',
      employeeId: 'emp-demo-ane' as EmployeeId,
      eventId: null,
      ruleId: null,
      correctionId: 'tc-demo-001' as TimeCorrectionId,
      detectedAt: at(-2, '08:00'),
      summary: `DEMO: entrada ${forgotten.id} sin salida`,
      status: 'open',
      resolvedAt: null,
      resolutionNote: null,
      isDemo: true,
    },
    {
      id: 'inc-demo-002' as IncidentId,
      type: 'rest-period-not-met',
      severity: 'warning',
      employeeId: 'emp-demo-unai' as EmployeeId,
      eventId: null,
      ruleId: null,
      correctionId: null,
      detectedAt: at(0, '07:00'),
      summary:
        'DEMO: descanso entre jornadas inferior al configurado (regla pendiente de validación)',
      status: 'acknowledged',
      resolvedAt: null,
      resolutionNote: null,
      isDemo: true,
    },
    {
      id: 'inc-demo-003' as IncidentId,
      type: 'clock-in-without-assignment',
      severity: 'info',
      employeeId: 'emp-demo-ane' as EmployeeId,
      eventId: null,
      ruleId: null,
      correctionId: null,
      detectedAt: at(-1, '07:31'),
      summary: 'DEMO: fichaje sin evento asignado (permitido; solo informativo)',
      status: 'resolved',
      resolvedAt: at(-1, '12:00'),
      resolutionNote: 'DEMO: trabajo de oficina',
      isDemo: true,
    },
  ];

  return {
    employees: DEMO_EMPLOYEES,
    events,
    assignments,
    timeEntries,
    breakEntries,
    corrections,
    incidents,
  };
}
