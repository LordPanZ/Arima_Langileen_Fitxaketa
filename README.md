# ARIMA FICHA

Aplicación de **registro horario** para **Arima Cool Tour**. PWA _mobile-first_ en
castellano y euskera, pensada para 6–20 personas que fichan desde su propio
teléfono (Android o iPhone), con jornada variable según eventos y actividades.

> **Estado: fase 1.** Estructura, dominio, autenticación, permisos, pantallas,
> idiomas, reglas de seguridad y pruebas. **El fichaje es una simulación y no
> tiene validez legal.** No hay nada desplegado. Ver [PHASE_1_REPORT.md](PHASE_1_REPORT.md).

Proyecto independiente del ERP _Arima Gestión_.

## Documentación

| Documento                                                          | Contenido                                                          |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| [ARCHITECTURE.md](ARCHITECTURE.md)                                 | Capas, flujo de un fichaje, decisiones técnicas                    |
| [DATA_MODEL.md](DATA_MODEL.md)                                     | Entidades, colecciones Firestore, fechas y zonas horarias          |
| [LEGAL_REQUIREMENTS.md](LEGAL_REQUIREMENTS.md)                     | Requisitos laborales y decisiones pendientes de convenio           |
| [SECURITY.md](SECURITY.md)                                         | Roles, reglas, secretos, despliegue                                |
| [PHASE_1_REPORT.md](PHASE_1_REPORT.md)                             | Qué se ha hecho, resultados de pruebas, pendientes, plan de fase 2 |
| [src/i18n/locales/eu.review.json](src/i18n/locales/eu.review.json) | Traducciones al euskera pendientes de revisión lingüística         |

## Requisitos

- Node.js **22** (LTS) y npm 10+
- Java 11+ (solo para los emuladores de Firebase y las pruebas de reglas)
- Windows PowerShell, macOS o Linux

## Puesta en marcha (Windows PowerShell)

```powershell
# 1. Dependencias (raíz y Cloud Functions)
npm install
npm --prefix functions install

# 2. Navegador para las pruebas E2E (solo la primera vez)
npx playwright install chromium

# 3. Arrancar en modo demostración (sin Firebase, datos ficticios)
npm run dev:demo
# → http://localhost:5173  y elegir un perfil ficticio
```

### Modos de ejecución

| Modo        | Comando                      | Descripción                                                                                                     |
| ----------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `demo`      | `npm run dev:demo`           | Sin Firebase ni red. Login con perfiles ficticios. Recomendado para revisar la UI.                              |
| `emulators` | ver abajo                    | Firebase Auth, Firestore y Functions **locales** (proyecto `demo-arima-ficha`, nunca conecta con Google Cloud). |
| `firebase`  | `npm run dev` + `.env.local` | Proyecto real. **No usar sin autorización** (ver SECURITY.md).                                                  |

### Con emuladores de Firebase

```powershell
# Terminal 1: emuladores (Auth :9099, Firestore :8080, Functions :5001, UI :4000)
npm run emulators

# Terminal 2: crear cuentas ficticias con rol (muestra contraseñas aleatorias)
npm run emulators:seed

# Terminal 3: la PWA conectada a los emuladores
npm run dev:emulators
```

## Scripts

| Script                                       | Qué hace                                                          |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `npm run dev` / `dev:demo` / `dev:emulators` | Servidor de desarrollo Vite                                       |
| `npm run build` / `build:demo`               | Typecheck + build de producción en `dist/`                        |
| `npm run preview`                            | Sirve `dist/` en http://localhost:4173                            |
| `npm run typecheck`                          | TypeScript estricto (PWA + Functions)                             |
| `npm run lint`                               | ESLint (0 avisos permitidos)                                      |
| `npm run format` / `format:check`            | Prettier                                                          |
| `npm test`                                   | Tests unitarios y de componentes (Vitest)                         |
| `npm run test:functions`                     | Tests de autorización de Cloud Functions                          |
| `npm run test:rules`                         | Tests de reglas de Firestore (arranca el emulador; requiere Java) |
| `npm run test:e2e`                           | Navegación con Playwright (viewport Android e iPhone)             |
| `npm run check`                              | Typecheck + lint + formato + unit + functions + build             |

## Estructura

```
src/
  domain/          TypeScript puro: modelo, zona horaria, permisos, máquina de
                   estados del fichaje, reglas de jornada, contrato de Functions.
                   Compartido por la PWA y Cloud Functions.
  infrastructure/  Firebase, autenticación (real y demo), datos de demostración.
  ui/              React: páginas, componentes, guards de rutas.
  app/             Composición (servicios, router).
  i18n/            Recursos es/eu y lista de revisión del euskera.
functions/         Cloud Functions (callables) — backend.
tests/rules/       Pruebas de firestore.rules contra el emulador.
e2e/               Pruebas Playwright.
docs/screenshots/  Capturas de la fase 1.
```

## Principios del proyecto

1. Se puede fichar sin evento asignado.
2. Los registros originales nunca se modifican: las correcciones son registros nuevos.
3. La hora oficial de un fichaje online es la del servidor.
4. Sin GPS obligatorio ni vigilancia continua.
5. Reglas de jornada configurables.
6. Interfaz mobile-first.
7. Sin datos personales reales en desarrollo.
8. Ninguna reforma laboral pendiente se da por aprobada.
9. Sin servicios de pago ni despliegues sin autorización.
10. Sin contraseñas compartidas ni secretos en el código.
