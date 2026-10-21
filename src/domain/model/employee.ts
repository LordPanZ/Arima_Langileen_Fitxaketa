import type { AuthUid, ContractId, EmployeeId, LaborRuleId, LocalDate, UtcInstant } from './ids';
import type { Role } from '../auth/roles';

export type Locale = 'es' | 'eu';

export interface Employee {
  readonly id: EmployeeId;
  /** UID de Firebase Auth. Puede cambiar si se recrea la cuenta; el id no. */
  readonly authUid: AuthUid | null;
  /** Código interno de plantilla (no es el DNI; no se guardan DNI en fase 1). */
  readonly employeeCode: string;
  readonly displayName: string;
  readonly email: string;
  readonly role: Role;
  readonly preferredLocale: Locale;
  readonly status: 'active' | 'inactive';
  readonly createdAt: UtcInstant;
  readonly updatedAt: UtcInstant;
  /** true en todos los datos ficticios de desarrollo / demostración. */
  readonly isDemo: boolean;
}

export type ContractType =
  'indefinido' | 'temporal' | 'fijo-discontinuo' | 'formativo' | 'otro-pendiente';

export interface EmploymentContract {
  readonly id: ContractId;
  readonly employeeId: EmployeeId;
  readonly contractType: ContractType;
  readonly workdayType: 'full-time' | 'part-time';
  /** Horas semanales pactadas. En tiempo parcial el registro diario es obligatorio. */
  readonly agreedWeeklyHours: number;
  /** Convenio colectivo aplicable. null = pendiente de determinar (ver LEGAL_REQUIREMENTS.md). */
  readonly collectiveAgreementCode: string | null;
  /** Conjunto de reglas de jornada aplicable a este contrato. */
  readonly laborRuleIds: readonly LaborRuleId[];
  /** Fechas de calendario en Europe/Madrid, ambos extremos incluidos. */
  readonly validFrom: LocalDate;
  readonly validTo: LocalDate | null;
  readonly isDemo: boolean;
}
