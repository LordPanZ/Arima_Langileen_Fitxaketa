# Arquitectura — ARIMA FICHA

## Visión general

```
┌────────────── Teléfono (PWA) ───────────────┐        ┌──────── Firebase (UE) ────────┐
│ ui/  (React, Tailwind, React Router)        │        │ Authentication (email+pass)   │
│   │                                         │ token  │   custom claims: role,        │
│   ▼                                         │───────▶│   employeeId (solo backend)   │
│ app/ (composición de servicios)             │        │                               │
│   │                                         │ HTTPS  │ Cloud Functions (callables)   │
│   ▼                                         │───────▶│   auth → permiso → validación │
│ infrastructure/ (Firebase SDK | demo)       │        │   → hora del servidor         │
│   │                                         │        │   → escritura + auditoría     │
│   ▼                                         │ lectura│ Firestore                     │
│ domain/ (TS puro) ◀───── compartido ────────┼───────▶│   reglas: denegado por defecto│
└─────────────────────────────────────────────┘        └───────────────────────────────┘
```

### Capas

| Capa            | Ruta                 | Responsabilidad                                                                                                                    | Puede depender de  |
| --------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Dominio         | `src/domain`         | Tipos, reglas de negocio, zona horaria, permisos, máquina de estados, validación del contrato de Functions. Sin React ni Firebase. | nada               |
| Infraestructura | `src/infrastructure` | Firebase SDK, implementaciones de `AuthService`, `DataSource`, `ServerClock`; datos demo.                                          | dominio            |
| Interfaz        | `src/ui`             | Páginas, componentes, guards. Accede a Firebase **solo** vía servicios.                                                            | dominio, servicios |
| Composición     | `src/app`            | Elige implementaciones según el modo; router.                                                                                      | todo               |
| Backend         | `functions/src`      | Callables. Importa `src/domain` (se compila junto).                                                                                | dominio, Admin SDK |

ESLint impone estas fronteras (`no-restricted-imports` en `eslint.config.js`).

### Por qué el dominio es compartido

La máquina de estados (`clock/clockState.ts`), los permisos (`auth/permissions.ts`)
y la validación de entrada (`contracts/functionsApi.ts`) son **las mismas** en
cliente y servidor. El cliente las usa para la UX; el servidor, para decidir. El
`tsconfig` de `functions/` incluye `../src/domain` y lo compila dentro de
`functions/lib`, de modo que el paquete desplegable es autónomo.

## Modos de ejecución

`VITE_APP_MODE` = `demo` | `emulators` | `firebase` (`src/infrastructure/config/appConfig.ts`).

- **demo**: `DemoAuthService` (perfiles ficticios, sin contraseña), `DemoDataSource`,
  reloj del dispositivo **declarado como tal** en pantalla. El SDK de Firebase no se
  descarga (import dinámico).
- **emulators**: Firebase real contra emuladores locales; se exige `projectId` `demo-*`.
- **firebase**: proyecto real (no configurado; requiere autorización).

En fase 1, incluso con Firebase, las pantallas leen datos de demostración: la
fuente Firestore llega en fase 2.

## Flujo de un fichaje (diseño; fase 2 implementa los pasos 5–8)

1. La PWA genera `clientRequestId` (UUID) y llama a `recordPunch` con
   `{type, eventId|null, breakType, clientReportedAt, clientRequestId, note}`.
2. Functions resuelve identidad y rol **desde el token** (`resolveCaller`).
3. Comprueba el permiso `clock:self`.
4. Valida la entrada (rechaza campos desconocidos: el cliente no puede fijar `recordedAt`).
5. Idempotencia: si ya existe ese `clientRequestId`, devuelve el registro existente.
6. En una **transacción**: lee el último registro del trabajador, valida la
   transición con `transition()`, asigna `sequence + 1`, `recordedAt = hora del
servidor`, calcula `hash = SHA-256(contenido canónico + previousHash)`.
7. Escribe `timeEntries`/`breakEntries` y `auditEvents` en la misma transacción.
8. Devuelve `recordedAt` oficial y el desfase del reloj del dispositivo.

En fase 1 `recordPunch` llega hasta el paso 4 y responde `CLOCKING_DISABLED`
(interruptor `CLOCKING_ENABLED=false`); aun activándolo responde `NOT_IMPLEMENTED`.

### Sin conexión

Decisión de fase 1: **no** hay fichaje offline. El service worker solo precarga el
_app shell_; no cachea Firestore ni Functions, para que un fichaje nunca parezca
registrado si el servidor no lo confirmó. Si en fase 2+ se habilita, cada marca
offline irá con `source: "offline-sync"`, conservará la hora del dispositivo y la
de recepción, y generará incidencia si el desfase supera un umbral configurable.

## Correcciones

Nunca se edita un registro. La persona solicita una `TimeCorrection`
(`add-missing` / `adjust-time` / `void-entry`) con motivo obligatorio. Al aprobarla
(rol admin, con comentario obligatorio, nunca la propia) se crea un **registro
nuevo** con `source: "correction"` y `correctionId`. La vista calculada
(`buildWorkSessions`) aplica las correcciones aprobadas y marca la sesión como
corregida; los originales siguen visibles para auditoría.

## Reglas de jornada

`LaborRule` es configurable (parámetros, vigencia, estado, fuente, base legal).
`evaluateRules()` produce **avisos** (nunca bloqueos ni sanciones). Las reglas
por defecto están en `pending-legal-review` o `draft` hasta conocer el convenio.

## Fechas y zonas horarias

- Almacenamiento: instantes UTC (`UtcInstant`, ISO-8601 con `Z`; `Timestamp` en Firestore).
- Presentación y agrupación por día: `Europe/Madrid` (`domain/time/zone.ts`).
- Entrada manual de horas (correcciones): `madridWallTimeToUtc` detecta horas
  inexistentes (marzo) y ambiguas (octubre).
- La jornada se asigna al día natural de Madrid en que **empieza**.

## Decisiones técnicas

| Decisión                                                | Motivo                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| Callables en vez de escritura directa                   | Hora del servidor, validación y auditoría atómicas                  |
| Custom claims para el rol                               | Las reglas de Firestore y Functions lo leen sin consultas extra     |
| ID de asignación determinista `{eventId}__{employeeId}` | Las reglas pueden comprobar con `exists()` si alguien está asignado |
| Región `europe-southwest1` (Madrid)                     | Datos en la UE, latencia baja                                       |
| PWA con `registerType: prompt`                          | Las actualizaciones no se aplican a mitad de un fichaje             |
| Vitest 3                                                | Vitest 4 falló al instalar con npm 10 en este entorno               |
