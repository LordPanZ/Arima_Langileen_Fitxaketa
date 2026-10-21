# Seguridad — ARIMA FICHA

## Principios

1. **Denegado por defecto** en Firestore (`match /{document=**} { allow read, write: if false; }`).
2. **El cliente no escribe registros legales ni auditoría.** Solo Cloud Functions
   (Admin SDK) escribe `timeEntries`, `breakEntries`, `timeCorrections`,
   `auditEvents`, `incidents`, `employees`, `events`, `laborRules`.
   Única escritura directa del cliente: `userPreferences/{uid}` (idioma), validada.
3. **Identidad y rol salen del token**, nunca del cuerpo de la petición. Los
   custom claims `role` y `employeeId` solo los asigna `setUserRole` (admin).
4. **Autorización en tres capas**: UI (comodidad), reglas de Firestore (lectura),
   Cloud Functions (toda escritura). La UI nunca es la barrera de seguridad.
5. **Cuentas individuales.** No hay cuentas ni contraseñas compartidas.
6. **Sin secretos en el código.** `.env*.local`, cuentas de servicio y
   `functions/.env` están en `.gitignore`. `.env.demo` y `.env.emulators` se
   versionan porque no contienen secretos (proyecto `demo-*`).

## Roles

| Rol           | Puede                                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `employee`    | Fichar para sí, ver su historial, sus eventos, solicitar/retirar sus correcciones.                                                         |
| `coordinator` | Lo anterior + ver equipo, todos los eventos, gestionar eventos (fase 2), ver incidencias. **No** ve fichajes ajenos ni auditoría.          |
| `admin`       | Todo: plantilla, roles, fichajes de todos, revisar correcciones, incidencias, reglas, auditoría, exportar. No puede cambiar su propio rol. |
| `auditor`     | Solo lectura: plantilla, eventos, fichajes, incidencias, auditoría, exportar. No ficha.                                                    |

Matriz completa: `src/domain/auth/permissions.ts`.

## Pruebas de autorización

| Suite                                     | Qué cubre                                                                                                                                                                         | Comando                        |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `tests/rules/firestore.rules.test.ts`     | Aislamiento entre trabajadores, denegación por defecto, ninguna escritura de registros legales/auditoría para ningún rol, rol inventado en el token, preferencias.                | `npm run test:rules`           |
| `functions/src/handlers/handlers.test.ts` | Sin sesión, sin claims, rol del token vs. cuerpo, auditor no ficha, correcciones solo propias, solo admin revisa y asigna roles, nadie cambia su propio rol, fichaje desactivado. | `npm run test:functions`       |
| `src/domain/auth/permissions.test.ts`     | Matriz de permisos.                                                                                                                                                               | `npm test`                     |
| `src/ui/app.test.tsx`, `e2e/`             | Guards de rutas (UX).                                                                                                                                                             | `npm test`, `npm run test:e2e` |

## Hora oficial

En fichajes online la hora oficial es `recordedAt`, fijada por el servidor. La
hora del dispositivo (`clientReportedAt`) se guarda solo para detectar desfases.
La validación rechaza cualquier campo extra (p. ej. un `recordedAt` enviado por el cliente).

## Privacidad

- Sin GPS ni permisos del dispositivo (cabecera `Permissions-Policy` en `netlify.toml`).
- Datos mínimos: sin DNI, domicilio ni teléfono en fase 1.
- Región prevista: `europe-southwest1` (Madrid).
- Desarrollo solo con datos ficticios (`isDemo: true`, correos `*.invalid`).

## Despliegue y servicios de pago

**Nada está desplegado ni contratado.** Antes de cualquier despliegue hace falta
**autorización expresa**. Notas:

- Cloud Functions requiere plan **Blaze** (pago por uso) → requiere autorización.
- Configurar alertas de presupuesto en Google Cloud antes de activar Blaze.
- Netlify: `netlify.toml` preparado; no conectado a ningún sitio.

## Pendiente para fase 2 (seguridad)

- [ ] **App Check** (reCAPTCHA Enterprise / DeviceCheck) y `enforceAppCheck: true`.
- [ ] Política de contraseñas y bloqueo; valorar MFA para `admin`.
- [ ] Cadena de hashes en registros y auditoría; verificación periódica.
- [ ] Revocación de sesiones al desactivar a una persona (`revokeRefreshTokens`).
- [ ] Copias de seguridad programadas de Firestore (PITR) — con coste, requiere autorización.
- [ ] Content-Security-Policy estricta en `netlify.toml`.
- [ ] Revisión de dependencias (`npm audit`) en CI.

## Notificar un problema de seguridad

Comunicarlo de forma privada a la persona responsable del proyecto en Arima Cool
Tour. No abrir _issues_ públicos con detalles explotables.
