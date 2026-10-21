/**
 * Pruebas de autorización y aislamiento de usuarios sobre firestore.rules.
 * Ejecutar con: npm run test:rules (arranca el emulador de Firestore).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import { setLogLevel } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

// Las denegaciones esperadas generan logs de error del SDK: se silencian.
setLogLevel('silent');

const PROJECT_ID = 'demo-arima-ficha';
let env: RulesTestEnvironment;

type Role = 'employee' | 'coordinator' | 'admin' | 'auditor';
const users = {
  ane: { uid: 'uid-ane', role: 'employee', employeeId: 'emp-ane' },
  iker: { uid: 'uid-iker', role: 'employee', employeeId: 'emp-iker' },
  coord: { uid: 'uid-coord', role: 'coordinator', employeeId: 'emp-coord' },
  admin: { uid: 'uid-admin', role: 'admin', employeeId: 'emp-admin' },
  auditor: { uid: 'uid-auditor', role: 'auditor', employeeId: 'emp-auditor' },
} as const satisfies Record<string, { uid: string; role: Role; employeeId: string }>;

function db(who: keyof typeof users) {
  const u = users[who];
  return env.authenticatedContext(u.uid, { role: u.role, employeeId: u.employeeId }).firestore();
}
const anon = () => env.unauthenticatedContext().firestore();
/** Usuario autenticado pero sin rol asignado todavía. */
const noRole = () => env.authenticatedContext('uid-sin-rol', {}).firestore();
/** Usuario que intenta inventarse un rol en el token (no válido). */
const fakeRole = () =>
  env.authenticatedContext('uid-falso', { role: 'superadmin', employeeId: 'emp-x' }).firestore();

const entry = (employeeId: string) => ({
  employeeId,
  type: 'clock-in',
  recordedAt: '2026-10-21T07:00:00.000Z',
  source: 'online',
  isDemo: true,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const f = ctx.firestore();
    for (const u of Object.values(users)) {
      await setDoc(doc(f, 'employees', u.employeeId), {
        displayName: `Demo ${u.employeeId}`,
        role: u.role,
        isDemo: true,
      });
    }
    await setDoc(doc(f, 'timeEntries', 'te-ane-1'), entry('emp-ane'));
    await setDoc(doc(f, 'timeEntries', 'te-iker-1'), entry('emp-iker'));
    await setDoc(doc(f, 'breakEntries', 'be-ane-1'), { ...entry('emp-ane'), type: 'break-start' });
    await setDoc(doc(f, 'timeCorrections', 'tc-ane-1'), {
      employeeId: 'emp-ane',
      status: 'pending',
    });
    await setDoc(doc(f, 'timeCorrections', 'tc-iker-1'), {
      employeeId: 'emp-iker',
      status: 'pending',
    });
    await setDoc(doc(f, 'events', 'evt-1'), { name: 'Tour demo', isDemo: true });
    await setDoc(doc(f, 'events', 'evt-2'), { name: 'Otro tour demo', isDemo: true });
    await setDoc(doc(f, 'eventAssignments', 'evt-1__emp-ane'), {
      eventId: 'evt-1',
      employeeId: 'emp-ane',
    });
    await setDoc(doc(f, 'incidents', 'inc-ane-1'), { employeeId: 'emp-ane', status: 'open' });
    await setDoc(doc(f, 'incidents', 'inc-iker-1'), { employeeId: 'emp-iker', status: 'open' });
    await setDoc(doc(f, 'auditEvents', 'aud-1'), { action: 'auth.role-changed' });
    await setDoc(doc(f, 'laborRules', 'rule-1'), { code: 'MAX_DAILY_ORDINARY_HOURS' });
    await setDoc(doc(f, 'employmentContracts', 'ctr-ane'), { employeeId: 'emp-ane' });
    await setDoc(doc(f, 'workSchedules', 'ws-ane'), { employeeId: 'emp-ane' });
    await setDoc(doc(f, 'secretStuff', 'x'), { a: 1 });
  });
});

describe('denegado por defecto', () => {
  it('anónimos no leen nada', async () => {
    await assertFails(getDoc(doc(anon(), 'employees', 'emp-ane')));
    await assertFails(getDoc(doc(anon(), 'timeEntries', 'te-ane-1')));
    await assertFails(getDoc(doc(anon(), 'laborRules', 'rule-1')));
  });

  it('usuarios sin rol o con rol inventado no leen nada', async () => {
    await assertFails(getDoc(doc(noRole(), 'laborRules', 'rule-1')));
    await assertFails(getDoc(doc(fakeRole(), 'laborRules', 'rule-1')));
    await assertFails(getDoc(doc(fakeRole(), 'timeEntries', 'te-ane-1')));
  });

  it('colecciones no declaradas están cerradas incluso para admin', async () => {
    await assertFails(getDoc(doc(db('admin'), 'secretStuff', 'x')));
    await assertFails(setDoc(doc(db('admin'), 'secretStuff', 'y'), { a: 1 }));
  });
});

describe('aislamiento entre trabajadores', () => {
  it('cada trabajador lee sus propios fichajes', async () => {
    await assertSucceeds(getDoc(doc(db('ane'), 'timeEntries', 'te-ane-1')));
    await assertSucceeds(getDoc(doc(db('ane'), 'breakEntries', 'be-ane-1')));
  });

  it('no puede leer fichajes de otra persona', async () => {
    await assertFails(getDoc(doc(db('ane'), 'timeEntries', 'te-iker-1')));
    await assertFails(getDoc(doc(db('iker'), 'breakEntries', 'be-ane-1')));
  });

  it('las consultas solo funcionan filtradas por su propio employeeId', async () => {
    await assertSucceeds(
      getDocs(query(collection(db('ane'), 'timeEntries'), where('employeeId', '==', 'emp-ane'))),
    );
    await assertFails(getDocs(collection(db('ane'), 'timeEntries')));
    await assertFails(
      getDocs(query(collection(db('ane'), 'timeEntries'), where('employeeId', '==', 'emp-iker'))),
    );
  });

  it('perfil, contrato y horario: solo los propios', async () => {
    await assertSucceeds(getDoc(doc(db('ane'), 'employees', 'emp-ane')));
    await assertFails(getDoc(doc(db('ane'), 'employees', 'emp-iker')));
    await assertSucceeds(getDoc(doc(db('ane'), 'employmentContracts', 'ctr-ane')));
    await assertFails(getDoc(doc(db('iker'), 'employmentContracts', 'ctr-ane')));
    await assertSucceeds(getDoc(doc(db('ane'), 'workSchedules', 'ws-ane')));
    await assertFails(getDoc(doc(db('iker'), 'workSchedules', 'ws-ane')));
  });

  it('correcciones e incidencias: solo las propias', async () => {
    await assertSucceeds(getDoc(doc(db('ane'), 'timeCorrections', 'tc-ane-1')));
    await assertFails(getDoc(doc(db('ane'), 'timeCorrections', 'tc-iker-1')));
    await assertSucceeds(getDoc(doc(db('ane'), 'incidents', 'inc-ane-1')));
    await assertFails(getDoc(doc(db('ane'), 'incidents', 'inc-iker-1')));
  });

  it('solo ve eventos a los que está asignado', async () => {
    await assertSucceeds(getDoc(doc(db('ane'), 'events', 'evt-1')));
    await assertFails(getDoc(doc(db('ane'), 'events', 'evt-2')));
    await assertFails(getDoc(doc(db('iker'), 'events', 'evt-1')));
    await assertSucceeds(getDoc(doc(db('ane'), 'eventAssignments', 'evt-1__emp-ane')));
    await assertFails(getDoc(doc(db('iker'), 'eventAssignments', 'evt-1__emp-ane')));
  });

  it('el trabajador no lee auditoría', async () => {
    await assertFails(getDoc(doc(db('ane'), 'auditEvents', 'aud-1')));
  });
});

describe('registros legales: ninguna escritura directa desde el cliente', () => {
  const roles = ['ane', 'coord', 'admin', 'auditor'] as const;

  it.each(roles)('%s no puede crear fichajes', async (who) => {
    const me = users[who].employeeId;
    await assertFails(setDoc(doc(db(who), 'timeEntries', `new-${who}`), entry(me)));
    await assertFails(
      addDoc(collection(db(who), 'breakEntries'), { ...entry(me), type: 'break-start' }),
    );
  });

  it.each(roles)('%s no puede modificar ni borrar fichajes existentes', async (who) => {
    await assertFails(
      updateDoc(doc(db(who), 'timeEntries', 'te-ane-1'), {
        recordedAt: '2026-10-21T06:00:00.000Z',
      }),
    );
    await assertFails(deleteDoc(doc(db(who), 'timeEntries', 'te-ane-1')));
  });

  it.each(roles)('%s no puede escribir auditoría', async (who) => {
    await assertFails(setDoc(doc(db(who), 'auditEvents', `fake-${who}`), { action: 'x' }));
    await assertFails(updateDoc(doc(db(who), 'auditEvents', 'aud-1'), { action: 'tampered' }));
    await assertFails(deleteDoc(doc(db(who), 'auditEvents', 'aud-1')));
  });

  it.each(roles)('%s no puede crear ni aprobar correcciones directamente', async (who) => {
    await assertFails(
      setDoc(doc(db(who), 'timeCorrections', `tc-${who}`), {
        employeeId: users[who].employeeId,
        status: 'pending',
      }),
    );
    await assertFails(
      updateDoc(doc(db(who), 'timeCorrections', 'tc-ane-1'), { status: 'approved' }),
    );
  });

  it('nadie se asigna un rol escribiendo su ficha de empleado', async () => {
    await assertFails(updateDoc(doc(db('ane'), 'employees', 'emp-ane'), { role: 'admin' }));
    await assertFails(setDoc(doc(db('admin'), 'employees', 'emp-nuevo'), { role: 'admin' }));
  });

  it('nadie modifica reglas de jornada ni incidencias desde el cliente', async () => {
    await assertFails(updateDoc(doc(db('admin'), 'laborRules', 'rule-1'), { code: 'X' }));
    await assertFails(
      updateDoc(doc(db('admin'), 'incidents', 'inc-ane-1'), { status: 'resolved' }),
    );
  });
});

describe('roles de gestión', () => {
  it('admin y auditor leen todos los fichajes y la auditoría', async () => {
    for (const who of ['admin', 'auditor'] as const) {
      await assertSucceeds(getDoc(doc(db(who), 'timeEntries', 'te-iker-1')));
      await assertSucceeds(getDocs(collection(db(who), 'timeEntries')));
      await assertSucceeds(getDoc(doc(db(who), 'auditEvents', 'aud-1')));
    }
  });

  it('coordinador ve equipo, eventos e incidencias, pero no fichajes ajenos ni auditoría', async () => {
    await assertSucceeds(getDoc(doc(db('coord'), 'employees', 'emp-ane')));
    await assertSucceeds(getDoc(doc(db('coord'), 'events', 'evt-2')));
    await assertSucceeds(getDoc(doc(db('coord'), 'incidents', 'inc-iker-1')));
    await assertFails(getDoc(doc(db('coord'), 'timeEntries', 'te-ane-1')));
    await assertFails(getDoc(doc(db('coord'), 'auditEvents', 'aud-1')));
    await assertFails(getDoc(doc(db('coord'), 'employmentContracts', 'ctr-ane')));
  });

  it('cualquier usuario con rol lee las reglas de jornada', async () => {
    await assertSucceeds(getDoc(doc(db('ane'), 'laborRules', 'rule-1')));
  });
});

describe('preferencias de usuario (única escritura directa)', () => {
  it('cada uno guarda su idioma', async () => {
    await assertSucceeds(
      setDoc(doc(db('ane'), 'userPreferences', 'uid-ane'), {
        locale: 'eu',
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(getDoc(doc(db('ane'), 'userPreferences', 'uid-ane')));
  });

  it('no puede escribir las preferencias de otro', async () => {
    await assertFails(
      setDoc(doc(db('ane'), 'userPreferences', 'uid-iker'), {
        locale: 'eu',
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(getDoc(doc(db('ane'), 'userPreferences', 'uid-iker')));
  });

  it('solo campos permitidos y valores válidos', async () => {
    await assertFails(
      setDoc(doc(db('ane'), 'userPreferences', 'uid-ane'), {
        locale: 'fr',
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(db('ane'), 'userPreferences', 'uid-ane'), {
        locale: 'es',
        role: 'admin',
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(db('ane'), 'userPreferences', 'uid-ane'), {
        locale: 'es',
        updatedAt: new Date('2020-01-01'),
      }),
    );
  });
});
