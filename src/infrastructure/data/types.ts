import type {
  Employee,
  Event,
  EventAssignment,
  Incident,
  LaborRule,
  TimeCorrection,
} from '../../domain/model';
import type { Punch } from '../../domain/clock/workSessions';

/**
 * Puerto de lectura de datos para la UI.
 * Fase 1: solo existe la implementación de demostración.
 * Fase 2: implementación Firestore (lecturas permitidas por firestore.rules).
 */
export interface DataSource {
  readonly isDemo: boolean;
  getEmployee(id: string): Promise<Employee | null>;
  listEmployees(): Promise<readonly Employee[]>;
  listEvents(): Promise<readonly Event[]>;
  listAssignmentsForEmployee(employeeId: string): Promise<readonly EventAssignment[]>;
  listAssignmentsForEvent(eventId: string): Promise<readonly EventAssignment[]>;
  /** Marcas normalizadas (TimeEntry + BreakEntry, con correcciones aplicadas). */
  listPunches(employeeId: string): Promise<readonly Punch[]>;
  listAllPunches(): Promise<readonly Punch[]>;
  listCorrections(employeeId?: string): Promise<readonly TimeCorrection[]>;
  listIncidents(): Promise<readonly Incident[]>;
  listLaborRules(): Promise<readonly LaborRule[]>;
}
