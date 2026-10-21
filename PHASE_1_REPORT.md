# Informe de la fase 1 — ARIMA FICHA

Fecha: 21-10-2026 · Rama: `ccr-a31ba427-ljgjom`

## 1. Resumen

El repositorio estaba vacío. Se ha creado la base completa del proyecto:

- **Inicialización**: Vite 7, React 19, TypeScript 5.9 en modo estricto (`strict`,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), Tailwind 4, React
  Router 7, ESLint 9 (con fronteras entre capas y jsx-a11y), Prettier, Vitest 3,
  Playwright y PWA (`vite-plugin-pwa`).
- **Dominio compartido** (`src/domain`): las 11 entidades pedidas, IDs estables,
  instantes UTC y presentación en Europe/Madrid (con los cambios de hora
  resueltos), matriz de permisos, máquina de estados del fichaje, reconstrucción
  de jornadas, reglas de jornada configurables y el contrato validado de las
  Cloud Functions.
- **Autenticación**: Firebase Auth con email y contraseña individuales, roles
  `employee`/`coordinator`/`admin`/`auditor` como _custom claims_, rutas
  protegidas, cierre de sesión. Modo demo con perfiles ficticios. Script que crea
  cuentas ficticias en el emulador con contraseñas aleatorias que no se guardan.
- **Las 10 pantallas** pedidas, más «acceso denegado», «sin rol» y «no
  encontrada». Todo es mobile-first y los datos de demostración están marcados.
- **Fichaje simulado**: un aviso fijo dice «SIMULACIÓN — no se registra ninguna
  hora», cada botón pone «Simulación» y hay que confirmar en un diálogo. Lo
  simulado solo vive en memoria. La hora que se muestra se identifica como la
  del dispositivo.
- **Idiomas**: castellano y euskera completos en archivos JSON. El idioma se
  cambia desde la interfaz y se recuerda. 18 claves en euskera están marcadas
  para revisión lingüística en `src/i18n/locales/eu.review.json`.
- **Seguridad**: `firestore.rules` deniega todo por defecto y ningún cliente
  puede escribir registros legales ni auditoría. Las Cloud Functions validan
  autenticación, rol y entrada. El fichaje está desactivado
  (`CLOCKING_ENABLED=false`). `setUserRole` funciona y deja auditoría.
- **Documentación**: README, ARCHITECTURE, DATA_MODEL, LEGAL_REQUIREMENTS,
  SECURITY, este informe y los archivos `.env.example`.

## 2. Resultados reales de las pruebas

Ejecutadas en el contenedor Linux de desarrollo (Node 22.22, Java 21) el 21-10-2026:

| Prueba                          | Comando                                         | Resultado                                                                                                                                                                                                                           |
| ------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck (PWA + Functions)     | `npm run typecheck`                             | ✅ sin errores                                                                                                                                                                                                                      |
| Lint                            | `npm run lint`                                  | ✅ 0 errores, 0 avisos                                                                                                                                                                                                              |
| Formato                         | `npm run format:check`                          | ✅                                                                                                                                                                                                                                  |
| Unitarias y de componentes      | `npm test`                                      | ✅ 11 archivos, **64 tests**                                                                                                                                                                                                        |
| Autorización de Cloud Functions | `npm run test:functions`                        | ✅ **14 tests**                                                                                                                                                                                                                     |
| Reglas de Firestore (emulador)  | `npm run test:rules`                            | ✅ **34 tests**                                                                                                                                                                                                                     |
| Build de producción             | `npm run build`                                 | ✅ (PWA, 21 entradas precacheadas)                                                                                                                                                                                                  |
| Navegación E2E (Playwright)     | `npm run test:e2e`                              | ✅ **16 tests** (8 × viewport Pixel 7 + 8 × viewport iPhone 14, ambos con Chromium); 22 omitidos a propósito: son las capturas, que solo corren con `SCREENSHOTS=1`                                                                 |
| Prueba manual con emuladores    | Auth + Firestore + Functions + `emulators:seed` | ✅ `getServerTime` devuelve la hora del servidor; un anónimo recibe 401; `recordPunch` responde `CLOCKING_DISABLED`; un `employee` que llama a `setUserRole` recibe 403; `reviewTimeCorrection` como admin responde 501 (pendiente) |

**No se ha ejecutado**: ninguna prueba en Windows PowerShell, en Safari/WebKit
real ni en dispositivos físicos. Los comandos de PowerShell de este documento no
se han probado en Windows.

## 3. Previsualización

```powershell
npm install
npm --prefix functions install
npm run dev:demo            # http://localhost:5173
# o bien la build de producción:
npm run build:demo; npm run preview -- --mode demo   # http://localhost:4173
```

Para abrirlo desde el móvil en la misma red Wi-Fi: `npm run dev:demo -- --host`
y abrir la IP que muestra Vite. La instalación de la PWA en el móvil requiere
HTTPS, que llegará con el entorno de pruebas autorizado.

Capturas (viewport Pixel 7) en `docs/screenshots/`:
login, panel del trabajador, fichaje simulado, historial, mis eventos,
corrección, panel de gestión, plantilla, eventos, incidencias y fichaje en euskera.
Se regeneran con:

```powershell
$env:SCREENSHOTS=1; npx playwright test e2e/screenshots.spec.ts --project=mobile-android; Remove-Item Env:SCREENSHOTS
```

## 4. Problemas pendientes y limitaciones conocidas

| #   | Asunto                                                          | Detalle                                                                                                                                                                                                                                                                                                                       |
| --- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | **Convenio colectivo sin determinar**                           | Bloquea activar reglas y el uso real. Ver LEGAL_REQUIREMENTS.md §3.                                                                                                                                                                                                                                                           |
| P2  | Consulta a la representación legal e información a la plantilla | Necesarias antes del uso real (LEGAL §4).                                                                                                                                                                                                                                                                                     |
| P3  | Datos de pantalla siempre de demostración                       | Falta `FirestoreDataSource` (fase 2).                                                                                                                                                                                                                                                                                         |
| P4  | Revisión lingüística del euskera                                | 18 claves en `eu.review.json`. Conviene revisar el resto también.                                                                                                                                                                                                                                                             |
| P5  | `npm audit`                                                     | Producción (raíz): 4 avisos altos por `@grpc/grpc-js` (dependencia transitiva del SDK `firebase`). En total, contando dependencias de desarrollo (sobre todo `firebase-tools`), 16. Functions: 8 moderados. **No** se ha ejecutado `npm audit fix --force` porque mete cambios incompatibles. Hay que revisarlo en la fase 2. |
| P6  | Vitest 3 en vez de 4                                            | Vitest 4 falló al instalar con npm 10 (`Cannot read properties of null (reading 'edgesOut')`).                                                                                                                                                                                                                                |
| P7  | App Check desactivado                                           | `enforceAppCheck: false` hasta configurarlo (fase 2).                                                                                                                                                                                                                                                                         |
| P8  | Paquete JS principal ≈ 435 kB (138 kB gzip)                     | Se puede trocear por rutas. Firebase ya se carga solo cuando hace falta.                                                                                                                                                                                                                                                      |
| P9  | WebKit no probado                                               | Se usa el viewport de iPhone con Chromium. Hay que probar en Safari real.                                                                                                                                                                                                                                                     |
| P10 | Avisos IPv6 del emulador en el contenedor                       | Inofensivos. Los emuladores se fijan en `127.0.0.1`.                                                                                                                                                                                                                                                                          |
| P11 | Sin CI                                                          | No hay pipeline todavía. Propuesta: GitHub Actions con `npm run check` + `test:rules` + `test:e2e`.                                                                                                                                                                                                                           |
| P12 | Nada desplegado                                                 | Firebase (plan Blaze) y Netlify requieren autorización.                                                                                                                                                                                                                                                                       |

## 5. Plan de la fase 2 — fichaje real, integridad, correcciones y auditoría

**Requisitos previos**: autorización para crear el proyecto Firebase de **pruebas**
(con plan Blaze y alertas de presupuesto), decisiones C1, C2, C5 y E1–E4 de
LEGAL_REQUIREMENTS.md, y la revisión del euskera.

1. **Fichaje real (`recordPunch`, `getClockStatus`)**
   - Transacción: idempotencia por `clientRequestId`, último estado → `transition()`,
     `sequence + 1`, `recordedAt = serverTimestamp`.
   - Aviso de desfase si `|clientReportedAt − recordedAt|` supera un umbral configurable.
   - La UI sustituye la simulación por la llamada real y muestra la hora oficial
     devuelta. Se quita el aviso de simulación solo cuando se haya probado en emuladores.
   - Pruebas de integración contra emuladores (Auth + Firestore + Functions).
2. **Integridad**
   - Hash SHA-256 del contenido canónico + `previousHash` (cadena por trabajador).
   - Función programada de verificación de la cadena → incidencia si se rompe.
   - Mismo encadenado en `auditEvents`.
3. **Correcciones**
   - `requestTimeCorrection`, `withdrawTimeCorrection` y `reviewTimeCorrection`
     (con comentario obligatorio y sin poder revisar la propia solicitud), que
     crean un registro nuevo `source: "correction"`.
   - Seleccionar el registro afectado desde el historial. Notificar a la persona.
4. **Auditoría**
   - `AuditEvent` en la misma transacción que cada escritura.
   - Pantalla de auditoría (admin/auditor) con filtros y exportación.
5. **Datos reales en la UI**: `FirestoreDataSource` (consultas filtradas por
   `employeeId`, que las reglas ya exigen) y alta y baja de personas con
   `setUserRole`.
6. **Incidencias automáticas**: salida olvidada (función programada), reglas de
   jornada evaluadas al cerrar cada jornada, siempre como avisos.
7. **Seguridad**: App Check, revocar sesiones al dar de baja, CSP y CI.
8. **Exportación** de los registros de cada persona (copia para la persona trabajadora)
   y global (Inspección), con hash de integridad.

Fase 3 (orientativa): informes mensuales (tiempo parcial, horas extra),
distribución irregular según convenio, conservación y archivo de 4 años,
notificaciones y, si se decide, fichaje sin conexión.
