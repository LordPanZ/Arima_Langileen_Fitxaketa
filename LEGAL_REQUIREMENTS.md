# Requisitos legales — ARIMA FICHA

> **Aviso.** Este documento es una guía técnica para el desarrollo, **no es
> asesoramiento jurídico**. Debe validarlo la asesoría laboral de Arima Cool Tour
> antes de usar la aplicación con personas reales. Fecha de redacción: octubre de 2026.
> Las referencias normativas deben comprobarse en el BOE en su versión vigente.

## 1. Normativa de referencia (vigente según la información disponible)

| Norma                            | Qué exige                                                                                                                                               | Cómo lo cubre el diseño                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **ET art. 34.9** (RDL 8/2019)    | Registro **diario** de jornada con hora concreta de **inicio y fin** de cada persona.                                                                   | `TimeEntry` clock-in / clock-out, hora del servidor.                                |
| ET art. 34.9                     | Organización del registro mediante convenio, acuerdo de empresa o, en su defecto, **decisión empresarial previa consulta** con la representación legal. | **Pendiente**: hay que documentar esa consulta/acuerdo antes del uso real.          |
| ET art. 34.9                     | **Conservar 4 años** y tener los registros a disposición de las personas trabajadoras, su representación y la Inspección de Trabajo.                    | Registros _append-only_; exportación en fase 2; política de conservación en fase 3. |
| **ET art. 12.4.c**               | Tiempo parcial: registro día a día, totalización mensual y entrega de copia del resumen junto con el recibo de salarios.                                | `workdayType: part-time`; informe mensual en fase 3.                                |
| **ET art. 35.5**                 | Horas extraordinarias: registro diario, totalización en el periodo de abono y copia del resumen.                                                        | Cálculo de exceso en fase 3 (depende del convenio).                                 |
| ET art. 34.3                     | Máx. 9 h ordinarias diarias (salvo convenio/acuerdo); **12 h** entre jornadas.                                                                          | Reglas `MAX_DAILY_ORDINARY_HOURS`, `MIN_REST_BETWEEN_WORKDAYS` (avisos).            |
| ET art. 34.4                     | Pausa ≥ 15 min si la jornada continuada supera 6 h (tiempo efectivo si así lo dice convenio/contrato).                                                  | `BREAK_AFTER_CONTINUOUS_WORK`; `countsAsWorkTime: "pending-agreement"`.             |
| ET art. 34.1                     | 40 h semanales de promedio en cómputo anual.                                                                                                            | `MAX_WEEKLY_AVERAGE_HOURS` (borrador).                                              |
| ET art. 37.1                     | Descanso semanal de día y medio ininterrumpido (acumulable hasta 14 días).                                                                              | `MIN_WEEKLY_REST` (borrador).                                                       |
| RD 1561/1995                     | Jornadas especiales por sector.                                                                                                                         | **Revisar** si alguna actividad de Arima encaja.                                    |
| **LISOS**                        | Incumplir el registro de jornada es infracción (art. 7.5).                                                                                              | El sistema facilita el cumplimiento; no sustituye la gestión.                       |
| **RGPD + LOPDGDD** (arts. 87–91) | Minimización, información previa, intimidad en dispositivos digitales, desconexión digital (art. 88), geolocalización (art. 90).                        | Sin GPS, sin seguimiento continuo, datos mínimos, solo UE.                          |

## 2. Reformas pendientes — NO se dan por aprobadas

| Iniciativa                                                                                                                                                                                   | Estado que asume el proyecto                                                        | Acción                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Real Decreto de registro de jornada digital** (registro digital, objetivo, fiable, no manipulable y accesible en remoto por la Inspección; en tramitación según la información disponible) | **No aprobado.** No se implementa ninguna obligación que dependa de su texto final. | Verificar en el BOE antes de fase 2. El diseño ya va en esa línea (servidor como referencia, inmutabilidad, auditoría, exportación). |
| **Reducción de la jornada máxima legal** (p. ej. a 37,5 h)                                                                                                                                   | **No aprobada.** La regla sigue en 40 h y en estado `draft`.                        | Si se aprueba, se cambia el parámetro de la regla con nueva vigencia (`validFrom`), sin tocar código.                                |
| Cualquier otra reforma anunciada                                                                                                                                                             | No aprobada hasta su publicación en el BOE.                                         | —                                                                                                                                    |

## 3. Decisiones que dependen del convenio colectivo (BLOQUEANTES antes del uso real)

El convenio aplicable **no está determinado** (`collectiveAgreementCode: null`).
Depende de la actividad principal de Arima Cool Tour y de su ámbito territorial.
Candidatos a analizar por la asesoría (no exhaustivo): agencias de viajes,
ocio educativo y animación sociocultural, turismo activo / actividades
deportivas, hostelería (convenios provinciales de Gipuzkoa/Bizkaia/Araba).

| #   | Decisión                                                                                                               | Por qué importa                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| C1  | Convenio colectivo aplicable                                                                                           | Determina jornada máxima, descansos, distribución irregular, pausas.                         |
| C2  | ¿Las pausas computan como tiempo de trabajo? (comida, descanso)                                                        | Afecta al neto de horas.                                                                     |
| C3  | Distribución irregular de la jornada y periodo de cómputo                                                              | Jornada variable por eventos: puede haber semanas largas compensadas.                        |
| C4  | Preaviso de los cambios de horario/turnos                                                                              | `WorkSchedule.publishedAt`.                                                                  |
| C5  | Tiempo de **desplazamiento** a eventos (furgoneta, viaje, punto de encuentro)                                          | ¿Es tiempo de trabajo? ¿Se ficha al salir de casa, en la oficina o en el punto de encuentro? |
| C6  | Eventos con **pernocta** (campamentos, viajes de varios días): disponibilidad, guardias nocturnas, tiempo de presencia | Puede requerir tipos de registro adicionales.                                                |
| C7  | Horas extraordinarias: compensación, límites, registro                                                                 | ET 35.                                                                                       |
| C8  | Fijos discontinuos y llamamientos                                                                                      | Contrato frecuente en actividades de temporada.                                              |
| C9  | Trabajo nocturno (22:00–06:00)                                                                                         | Rutas nocturnas; regla específica.                                                           |
| C10 | Descanso entre jornadas: excepciones aplicables                                                                        | Eventos que terminan tarde y empiezan pronto.                                                |

## 4. Decisiones de empresa (pendientes)

| #   | Decisión                                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Documento de **consulta a la representación legal** (o acuerdo) sobre el sistema de registro.                                                                                     |
| E2  | **Información a la plantilla** (RGPD art. 13): finalidad, base jurídica (obligación legal, art. 6.1.c), conservación, derechos.                                                   |
| E3  | Uso de **teléfonos personales**: política, alternativa para quien no quiera o no pueda (p. ej. terminal compartido con cuenta individual, o registro por coordinación con firma). |
| E4  | Quién aprueba correcciones; plazos para solicitarlas; qué pasa si no se resuelven.                                                                                                |
| E5  | Cómo y con qué frecuencia se entrega a cada persona copia de sus registros.                                                                                                       |
| E6  | Procedimiento de exportación para la Inspección de Trabajo.                                                                                                                       |
| E7  | ¿Se permite fichaje offline? (ver ARCHITECTURE.md).                                                                                                                               |
| E8  | Evaluación de impacto (EIPD): probablemente no obligatoria a esta escala sin GPS, pero conviene documentar el análisis.                                                           |
| E9  | Encargado del tratamiento: contrato con Google (Firebase) y Netlify; ubicación de datos en la UE.                                                                                 |

## 5. Lo que la aplicación NO hace (por diseño)

- No geolocaliza ni hace seguimiento continuo.
- No bloquea fichajes por incumplir reglas ni sanciona automáticamente: genera avisos.
- No permite editar ni borrar un registro: solo añadir correcciones trazables.
- No toma la hora del dispositivo como oficial en fichajes online.
- No exige tener un evento asignado para fichar.

## 6. Requisitos derivados para fase 2

1. Hora del servidor, secuencia y cadena de hashes en todos los registros.
2. Auditoría de cada escritura en la misma transacción.
3. Acceso de cada persona a sus propios registros y descarga de copia.
4. Exportación completa para Inspección (CSV/PDF firmados con hash).
5. Rol `auditor` de solo lectura para representación legal o Inspección si se acuerda.
