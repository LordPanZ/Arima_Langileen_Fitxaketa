import type { EmployeeId, EventId, LocalDate, UtcInstant, WorkScheduleId } from './ids';

/** Turno previsto. La jornada es variable: los turnos dependen de los eventos. */
export interface PlannedShift {
  readonly startAt: UtcInstant;
  readonly endAt: UtcInstant;
  readonly eventId: EventId | null;
  readonly note: string | null;
}

export interface WorkSchedule {
  readonly id: WorkScheduleId;
  readonly employeeId: EmployeeId;
  readonly kind: 'variable' | 'fixed';
  /** Periodo cubierto (fechas de calendario Europe/Madrid, inclusivas). */
  readonly periodStart: LocalDate;
  readonly periodEnd: LocalDate;
  readonly plannedShifts: readonly PlannedShift[];
  /** Momento en que se comunicó al trabajador (preaviso: pendiente de convenio). */
  readonly publishedAt: UtcInstant | null;
  readonly isDemo: boolean;
}
