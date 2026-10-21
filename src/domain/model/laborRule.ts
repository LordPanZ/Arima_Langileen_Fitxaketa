import type { LaborRuleId, LocalDate } from './ids';

/**
 * Reglas de jornada configurables. Los valores por defecto proceden del
 * Estatuto de los Trabajadores, pero el convenio colectivo aplicable puede
 * cambiarlos: por eso cada regla tiene estado y fuente, y las que no estén
 * validadas solo generan avisos (nunca bloquean).
 */
export type LaborRuleStatus = 'draft' | 'pending-legal-review' | 'active' | 'retired';
export type LaborRuleSource = 'statute' | 'collective-agreement' | 'contract' | 'company-policy';
export type LaborRuleSeverity = 'info' | 'warning';

interface LaborRuleBase {
  readonly id: LaborRuleId;
  readonly status: LaborRuleStatus;
  readonly source: LaborRuleSource;
  /** Referencia normativa (p. ej. "ET art. 34.3"). Revisar con asesoría. */
  readonly legalBasis: string;
  readonly severity: LaborRuleSeverity;
  readonly validFrom: LocalDate;
  readonly validTo: LocalDate | null;
  readonly notes: string | null;
}

export interface MaxDailyHoursRule extends LaborRuleBase {
  readonly code: 'MAX_DAILY_ORDINARY_HOURS';
  readonly params: { readonly maxMinutes: number };
}

export interface MinRestBetweenWorkdaysRule extends LaborRuleBase {
  readonly code: 'MIN_REST_BETWEEN_WORKDAYS';
  readonly params: { readonly minMinutes: number };
}

export interface BreakAfterContinuousWorkRule extends LaborRuleBase {
  readonly code: 'BREAK_AFTER_CONTINUOUS_WORK';
  readonly params: {
    /** Trabajo continuado a partir del cual se exige pausa. */
    readonly continuousWorkMinutes: number;
    /** Duración mínima de la pausa. */
    readonly minBreakMinutes: number;
  };
}

export interface MinWeeklyRestRule extends LaborRuleBase {
  readonly code: 'MIN_WEEKLY_REST';
  readonly params: { readonly minMinutes: number };
}

export interface MaxWeeklyAverageHoursRule extends LaborRuleBase {
  readonly code: 'MAX_WEEKLY_AVERAGE_HOURS';
  readonly params: { readonly maxMinutes: number; readonly averagingWeeks: number };
}

export type LaborRule =
  | MaxDailyHoursRule
  | MinRestBetweenWorkdaysRule
  | BreakAfterContinuousWorkRule
  | MinWeeklyRestRule
  | MaxWeeklyAverageHoursRule;

export type LaborRuleCode = LaborRule['code'];
