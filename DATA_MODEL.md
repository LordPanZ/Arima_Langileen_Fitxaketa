# Modelo de datos — ARIMA FICHA

Tipos en `src/domain/model/`. Todas las entidades tienen **ID estable** (ID de
documento Firestore o UUID; validado por `isStableId`) que no cambia aunque
cambien nombre, correo o cuenta.

## Convenciones de fechas

| Tipo         | Formato                    | Uso                                                                      |
| ------------ | -------------------------- | ------------------------------------------------------------------------ |
| `UtcInstant` | `2026-10-21T08:00:00.000Z` | Todo instante. En Firestore se guardará como `Timestamp`.                |
| `LocalDate`  | `2026-10-21`               | Fecha de calendario **en Europe/Madrid** (vigencias, día de la jornada). |

No se almacenan horas locales sin zona. La zona de presentación es
`Europe/Madrid` (`COMPANY_TIME_ZONE`).

## Entidades y colecciones

| Entidad              | Colección                                  | Escribe                       | Lee (reglas)                           |
| -------------------- | ------------------------------------------ | ----------------------------- | -------------------------------------- |
| `Employee`           | `employees/{employeeId}`                   | backend                       | uno mismo; coordinator, admin, auditor |
| `EmploymentContract` | `employmentContracts/{id}`                 | backend                       | uno mismo; admin, auditor              |
| `WorkSchedule`       | `workSchedules/{id}`                       | backend                       | uno mismo; coordinator, admin, auditor |
| `Event`              | `events/{eventId}`                         | backend                       | asignados; coordinator, admin, auditor |
| `EventAssignment`    | `eventAssignments/{eventId}__{employeeId}` | backend                       | uno mismo; coordinator, admin, auditor |
| `TimeEntry`          | `timeEntries/{id}`                         | **solo backend, append-only** | uno mismo; admin, auditor              |
| `BreakEntry`         | `breakEntries/{id}`                        | **solo backend, append-only** | uno mismo; admin, auditor              |
| `TimeCorrection`     | `timeCorrections/{id}`                     | backend                       | uno mismo; admin, auditor              |
| `Incident`           | `incidents/{id}`                           | backend                       | afectado; coordinator, admin, auditor  |
| `AuditEvent`         | `auditEvents/{id}`                         | **solo backend, append-only** | admin, auditor                         |
| `LaborRule`          | `laborRules/{id}`                          | backend                       | cualquier usuario con rol              |
| (preferencias)       | `userPreferences/{uid}`                    | el propio usuario (`locale`)  | el propio usuario                      |

### Employee

`id, authUid|null, employeeCode, displayName, email, role, preferredLocale (es|eu),
status (active|inactive), createdAt, updatedAt, isDemo`.
No se guardan DNI, domicilio, teléfono ni datos bancarios en fase 1.

### EmploymentContract

`id, employeeId, contractType, workdayType (full-time|part-time), agreedWeeklyHours,
collectiveAgreementCode|null (pendiente), laborRuleIds[], validFrom, validTo|null, isDemo`.

### WorkSchedule

`id, employeeId, kind (variable|fixed), periodStart, periodEnd, plannedShifts[{startAt,
endAt, eventId|null, note}], publishedAt|null, isDemo`.

### Event / EventAssignment

`Event`: `id, code, name, description, locationLabel (texto, sin GPS), startAt, endAt,
status (draft|scheduled|in-progress|finished|cancelled), coordinatorIds[], isDemo`.
`EventAssignment`: `id = {eventId}__{employeeId}, eventId, employeeId, task,
plannedStartAt, plannedEndAt, status (assigned|confirmed|declined|cancelled), isDemo`.

### TimeEntry / BreakEntry (registros legales)

Comunes (`LegalRecordIntegrity`):

| Campo                  | Descripción                              |
| ---------------------- | ---------------------------------------- |
| `recordedAt`           | **Hora oficial = hora del servidor**     |
| `clientReportedAt`     | Hora del dispositivo (informativa)       |
| `clientRequestId`      | Idempotencia                             |
| `source`               | `online` · `offline-sync` · `correction` |
| `sequence`             | Correlativo por trabajador, sin huecos   |
| `previousHash`, `hash` | Cadena SHA-256 (fase 2)                  |
| `createdByUid`         | Quién lo creó                            |
| `correctionId`         | Si procede de una corrección             |

`TimeEntry`: `type (clock-in|clock-out), eventId|null, note`.
`BreakEntry`: `type (break-start|break-end), breakType (rest|meal|other),
countsAsWorkTime (true|false|"pending-agreement")`.

### TimeCorrection

`id, employeeId, kind (add-missing|adjust-time|void-entry), targetEntryId|null,
punchType, proposedAt|null, reason, requestedByUid, requestedAt,
status (pending|approved|rejected|withdrawn), reviewedByUid, reviewedAt,
reviewComment, resultingEntryId, isDemo`.

### Incident

`id, type, severity (info|warning|critical), employeeId, eventId, ruleId,
correctionId, detectedAt, summary, status (open|acknowledged|resolved),
resolvedAt, resolutionNote, isDemo`. Siempre para revisión humana.

### AuditEvent

`id, at, actorUid, actorRole, action, targetType, targetId, details (sin datos
personales innecesarios), requestId, previousHash, hash`.

### LaborRule

Unión discriminada por `code`:

| code                          | params                                     |
| ----------------------------- | ------------------------------------------ |
| `MAX_DAILY_ORDINARY_HOURS`    | `maxMinutes`                               |
| `MIN_REST_BETWEEN_WORKDAYS`   | `minMinutes`                               |
| `BREAK_AFTER_CONTINUOUS_WORK` | `continuousWorkMinutes`, `minBreakMinutes` |
| `MIN_WEEKLY_REST`             | `minMinutes`                               |
| `MAX_WEEKLY_AVERAGE_HOURS`    | `maxMinutes`, `averagingWeeks`             |

Comunes: `status (draft|pending-legal-review|active|retired), source
(statute|collective-agreement|contract|company-policy), legalBasis, severity
(info|warning), validFrom, validTo, notes`.

## Vistas calculadas (no se almacenan)

`buildWorkSessions(punches)` → `WorkSession` (día natural de Madrid, bruto, pausas,
neto, anomalías: `missing-clock-out`, `break-not-closed`, `orphan-punch`,
`non-monotonic-time`). `evaluateRules(sessions, rules)` → avisos.

## Índices

`firestore.indexes.json`: `timeEntries`/`breakEntries` por `employeeId + recordedAt`,
`timeCorrections` por `status + requestedAt`, `eventAssignments` por
`employeeId + plannedStartAt`.

## Conservación

Registros de jornada: **4 años** (ET art. 34.9). Política de borrado/archivo:
pendiente (fase 3). Los registros legales no se borran desde la app.
