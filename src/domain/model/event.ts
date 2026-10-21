import type { EmployeeId, EventAssignmentId, EventId, UtcInstant } from './ids';

export type EventStatus = 'draft' | 'scheduled' | 'in-progress' | 'finished' | 'cancelled';

/** Evento o actividad de Arima Cool Tour (tour, visita, campamento, etc.). */
export interface Event {
  readonly id: EventId;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  /** Texto libre ("Donostia — Parte Vieja"). No se usan coordenadas GPS. */
  readonly locationLabel: string | null;
  readonly startAt: UtcInstant;
  readonly endAt: UtcInstant;
  readonly status: EventStatus;
  readonly coordinatorIds: readonly EmployeeId[];
  readonly isDemo: boolean;
}

export type AssignmentStatus = 'assigned' | 'confirmed' | 'declined' | 'cancelled';

/**
 * Asignación de un trabajador a un evento.
 * ID determinista: `${eventId}__${employeeId}` (lo usan las reglas de Firestore).
 */
export interface EventAssignment {
  readonly id: EventAssignmentId;
  readonly eventId: EventId;
  readonly employeeId: EmployeeId;
  readonly task: string | null;
  readonly plannedStartAt: UtcInstant;
  readonly plannedEndAt: UtcInstant;
  readonly status: AssignmentStatus;
  readonly isDemo: boolean;
}

export function eventAssignmentId(eventId: EventId, employeeId: EmployeeId): EventAssignmentId {
  return `${eventId}__${employeeId}` as EventAssignmentId;
}
