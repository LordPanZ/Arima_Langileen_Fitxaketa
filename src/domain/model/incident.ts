import type {
  EmployeeId,
  EventId,
  IncidentId,
  LaborRuleId,
  TimeCorrectionId,
  UtcInstant,
} from './ids';

export type IncidentType =
  | 'missing-clock-out'
  | 'rest-period-not-met'
  | 'max-daily-hours-exceeded'
  | 'break-not-taken'
  | 'clock-in-without-assignment'
  | 'clock-device-time-skew'
  | 'correction-requested'
  | 'other';

export type IncidentSeverity = 'info' | 'warning' | 'critical';
export type IncidentStatus = 'open' | 'acknowledged' | 'resolved';

/**
 * Incidencia: aviso para revisión humana. Nunca bloquea un fichaje ni
 * sanciona automáticamente (ver LEGAL_REQUIREMENTS.md).
 */
export interface Incident {
  readonly id: IncidentId;
  readonly type: IncidentType;
  readonly severity: IncidentSeverity;
  readonly employeeId: EmployeeId | null;
  readonly eventId: EventId | null;
  readonly ruleId: LaborRuleId | null;
  readonly correctionId: TimeCorrectionId | null;
  readonly detectedAt: UtcInstant;
  readonly summary: string;
  readonly status: IncidentStatus;
  readonly resolvedAt: UtcInstant | null;
  readonly resolutionNote: string | null;
  readonly isDemo: boolean;
}
