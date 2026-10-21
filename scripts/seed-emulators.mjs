// Crea cuentas FICTICIAS en el emulador de Firebase Auth con su rol (custom
// claims). Solo funciona contra emuladores locales y proyectos "demo-*".
//
// Las contraseñas se generan al azar en cada ejecución y solo se muestran por
// pantalla: no se guardan en ningún archivo ni en el repositorio.
//
// Uso (con "npm run emulators" en otra terminal):  npm run emulators:seed
import { randomBytes } from 'node:crypto';

const PROJECT = 'demo-arima-ficha';
const HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
const BASE = `http://${HOST}/identitytoolkit.googleapis.com/v1`;
const ADMIN = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' };

const users = [
  {
    email: 'ane.proba@demo.arima-ficha.invalid',
    name: 'Ane Proba (DEMO)',
    role: 'employee',
    employeeId: 'emp-demo-ane',
  },
  {
    email: 'iker.adibide@demo.arima-ficha.invalid',
    name: 'Iker Adibide (DEMO)',
    role: 'coordinator',
    employeeId: 'emp-demo-iker',
  },
  {
    email: 'miren.saiakera@demo.arima-ficha.invalid',
    name: 'Miren Saiakera (DEMO)',
    role: 'admin',
    employeeId: 'emp-demo-miren',
  },
  {
    email: 'jon.ikuskari@demo.arima-ficha.invalid',
    name: 'Jon Ikuskari (DEMO)',
    role: 'auditor',
    employeeId: 'emp-demo-jon',
  },
];

async function call(path, body, headers = ADMIN) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${path}: ${JSON.stringify(json.error ?? json)}`);
  return json;
}

try {
  await fetch(`http://${HOST}/`);
} catch {
  console.error(
    `No se encuentra el emulador de Auth en ${HOST}. Arranca antes "npm run emulators".`,
  );
  process.exit(1);
}

console.log('Cuentas ficticias (contraseñas válidas solo en este emulador y hasta reiniciarlo):\n');
for (const u of users) {
  const password = randomBytes(12).toString('base64url');
  const { localId } = await call(`/projects/${PROJECT}/accounts`, {
    email: u.email,
    password,
    displayName: u.name,
  });
  await call(`/projects/${PROJECT}/accounts:update`, {
    localId,
    customAttributes: JSON.stringify({ role: u.role, employeeId: u.employeeId }),
  });
  console.log(`  ${u.role.padEnd(12)} ${u.email.padEnd(42)} ${password}`);
}
console.log('\nEstas cuentas y contraseñas son ficticias. No las reutilices fuera del emulador.');
