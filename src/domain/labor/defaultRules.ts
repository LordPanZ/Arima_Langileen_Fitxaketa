import type { LaborRule } from '../model/laborRule';
import type { LaborRuleId, LocalDate } from '../model/ids';

/**
 * Valores por defecto del Estatuto de los Trabajadores (RDL 2/2015).
 * TODAS en estado "pending-legal-review": deben validarse con el convenio
 * colectivo aplicable y la asesoría laboral antes de activarse.
 * Ver LEGAL_REQUIREMENTS.md.
 */
const FROM = '2026-01-01' as LocalDate;

export const DEFAULT_LABOR_RULES: readonly LaborRule[] = [
  {
    id: 'rule-max-daily-ordinary' as LaborRuleId,
    code: 'MAX_DAILY_ORDINARY_HOURS',
    params: { maxMinutes: 9 * 60 },
    status: 'pending-legal-review',
    source: 'statute',
    legalBasis: 'ET art. 34.3 (9 h ordinarias diarias salvo convenio o acuerdo)',
    severity: 'warning',
    validFrom: FROM,
    validTo: null,
    notes: 'El convenio o acuerdo de empresa puede establecer otra distribución.',
  },
  {
    id: 'rule-min-rest-between-workdays' as LaborRuleId,
    code: 'MIN_REST_BETWEEN_WORKDAYS',
    params: { minMinutes: 12 * 60 },
    status: 'pending-legal-review',
    source: 'statute',
    legalBasis: 'ET art. 34.3 (12 h entre jornadas)',
    severity: 'warning',
    validFrom: FROM,
    validTo: null,
    notes: 'RD 1561/1995 prevé excepciones sectoriales. Revisar si aplica a la actividad.',
  },
  {
    id: 'rule-break-after-6h' as LaborRuleId,
    code: 'BREAK_AFTER_CONTINUOUS_WORK',
    params: { continuousWorkMinutes: 6 * 60, minBreakMinutes: 15 },
    status: 'pending-legal-review',
    source: 'statute',
    legalBasis: 'ET art. 34.4 (pausa ≥ 15 min si la jornada continuada supera 6 h)',
    severity: 'warning',
    validFrom: FROM,
    validTo: null,
    notes: 'Si computa como trabajo efectivo depende de convenio o contrato.',
  },
  {
    id: 'rule-min-weekly-rest' as LaborRuleId,
    code: 'MIN_WEEKLY_REST',
    params: { minMinutes: 36 * 60 },
    status: 'draft',
    source: 'statute',
    legalBasis: 'ET art. 37.1 (día y medio ininterrumpido, acumulable hasta 14 días)',
    severity: 'info',
    validFrom: FROM,
    validTo: null,
    notes: 'Periodo de cómputo pendiente de convenio. No se evalúa en fase 1.',
  },
  {
    id: 'rule-max-weekly-average' as LaborRuleId,
    code: 'MAX_WEEKLY_AVERAGE_HOURS',
    params: { maxMinutes: 40 * 60, averagingWeeks: 52 },
    status: 'draft',
    source: 'statute',
    legalBasis: 'ET art. 34.1 (40 h semanales de promedio en cómputo anual)',
    severity: 'info',
    validFrom: FROM,
    validTo: null,
    notes:
      'Cualquier reducción de la jornada máxima legal NO se da por aprobada hasta su publicación en el BOE.',
  },
];
