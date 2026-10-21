import { describe, expect, it, vi } from 'vitest';
import type { AuthLike } from '../caller';
import type { HandlerDeps } from '../deps';
import { AppError } from '../errors';
import * as h from './handlers';

const uuid = '3f1c2b9e-8d7a-4c6b-9e5f-1a2b3c4d5e6f';
const FIXED_NOW = new Date('2026-10-21T08:00:00.000Z');

function makeDeps(overrides: Partial<HandlerDeps> = {}): HandlerDeps {
  return {
    now: () => FIXED_NOW,
    clockingEnabled: () => false,
    setRoleClaims: vi.fn(async () => {}),
    writeAudit: vi.fn(async () => {}),
    ...overrides,
  };
}

const as = (role: string, employeeId = `emp-${role}`, uid = `uid-${role}`): AuthLike => ({
  uid,
  token: { role, employeeId },
});

const punch = {
  type: 'clock-in',
  eventId: null,
  breakType: null,
  clientReportedAt: '2026-10-21T08:00:05.000Z',
  clientRequestId: uuid,
  note: null,
};

async function codeOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return 'OK';
  } catch (e) {
    if (e instanceof AppError) return e.code;
    throw e;
  }
}

describe('autenticación', () => {
  it('rechaza llamadas sin sesión', async () => {
    expect(await codeOf(h.getServerTime(undefined, {}, makeDeps()))).toBe('UNAUTHENTICATED');
    expect(await codeOf(h.recordPunch(undefined, punch, makeDeps()))).toBe('UNAUTHENTICATED');
  });

  it('rechaza cuentas sin rol o con rol inventado', async () => {
    expect(await codeOf(h.getServerTime({ uid: 'u1', token: {} }, {}, makeDeps()))).toBe(
      'MISSING_CLAIMS',
    );
    expect(
      await codeOf(
        h.getServerTime(
          { uid: 'u1', token: { role: 'superadmin', employeeId: 'e1' } },
          {},
          makeDeps(),
        ),
      ),
    ).toBe('MISSING_CLAIMS');
  });

  it('el rol sale del token, no del cuerpo de la petición', async () => {
    const r = h.reviewTimeCorrection(
      as('employee'),
      { correctionId: 'c1', decision: 'approve', comment: 'ok', role: 'admin' },
      makeDeps(),
    );
    expect(await codeOf(r)).toBe('FORBIDDEN');
  });
});

describe('getServerTime', () => {
  it('devuelve la hora del servidor en UTC', async () => {
    await expect(h.getServerTime(as('employee'), {}, makeDeps())).resolves.toEqual({
      serverTime: '2026-10-21T08:00:00.000Z',
      timeZone: 'Europe/Madrid',
    });
  });
});

describe('recordPunch (fase 1: desactivado)', () => {
  it('auditor no puede fichar', async () => {
    expect(await codeOf(h.recordPunch(as('auditor'), punch, makeDeps()))).toBe('FORBIDDEN');
  });

  it('valida la entrada antes de nada', async () => {
    expect(
      await codeOf(
        h.recordPunch(
          as('employee'),
          { ...punch, recordedAt: '2020-01-01T00:00:00.000Z' },
          makeDeps(),
        ),
      ),
    ).toBe('INVALID_ARGUMENT');
  });

  it('con CLOCKING_ENABLED=false nunca registra', async () => {
    for (const role of ['employee', 'coordinator', 'admin']) {
      expect(await codeOf(h.recordPunch(as(role), punch, makeDeps()))).toBe('CLOCKING_DISABLED');
    }
  });

  it('aunque se active el interruptor, no hay escritura implementada en fase 1', async () => {
    expect(
      await codeOf(h.recordPunch(as('employee'), punch, makeDeps({ clockingEnabled: () => true }))),
    ).toBe('NOT_IMPLEMENTED');
  });
});

describe('correcciones: aislamiento entre trabajadores', () => {
  const req = {
    employeeId: 'emp-employee',
    kind: 'add-missing',
    targetEntryId: null,
    punchType: 'clock-out',
    proposedAt: '2026-10-21T15:00:00.000Z',
    reason: 'Olvidé fichar la salida al terminar el tour',
    clientRequestId: uuid,
  };

  it('un trabajador no puede pedir correcciones para otro', async () => {
    expect(
      await codeOf(
        h.requestTimeCorrection(
          as('employee'),
          { ...req, employeeId: 'emp-otra-persona' },
          makeDeps(),
        ),
      ),
    ).toBe('FORBIDDEN');
  });

  it('su propia solicitud pasa la autorización (escritura pendiente de fase 2)', async () => {
    expect(await codeOf(h.requestTimeCorrection(as('employee'), req, makeDeps()))).toBe(
      'NOT_IMPLEMENTED',
    );
  });

  it('solo admin revisa correcciones', async () => {
    const review = { correctionId: 'c1', decision: 'approve', comment: 'Comprobado' };
    expect(await codeOf(h.reviewTimeCorrection(as('employee'), review, makeDeps()))).toBe(
      'FORBIDDEN',
    );
    expect(await codeOf(h.reviewTimeCorrection(as('coordinator'), review, makeDeps()))).toBe(
      'FORBIDDEN',
    );
    expect(await codeOf(h.reviewTimeCorrection(as('auditor'), review, makeDeps()))).toBe(
      'FORBIDDEN',
    );
    expect(await codeOf(h.reviewTimeCorrection(as('admin'), review, makeDeps()))).toBe(
      'NOT_IMPLEMENTED',
    );
  });
});

describe('setUserRole', () => {
  const body = { targetUid: 'uid-nueva', employeeId: 'emp-nueva', role: 'coordinator' };

  it('solo admin asigna roles', async () => {
    for (const role of ['employee', 'coordinator', 'auditor']) {
      expect(await codeOf(h.setUserRole(as(role), body, makeDeps()))).toBe('FORBIDDEN');
    }
  });

  it('nadie puede cambiar su propio rol', async () => {
    expect(
      await codeOf(h.setUserRole(as('admin'), { ...body, targetUid: 'uid-admin' }, makeDeps())),
    ).toBe('SELF_ROLE_CHANGE');
  });

  it('asigna claims y deja rastro de auditoría', async () => {
    const deps = makeDeps();
    await expect(h.setUserRole(as('admin'), body, deps)).resolves.toEqual({
      targetUid: 'uid-nueva',
      role: 'coordinator',
    });
    expect(deps.setRoleClaims).toHaveBeenCalledWith('uid-nueva', {
      role: 'coordinator',
      employeeId: 'emp-nueva',
    });
    expect(deps.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.role-changed',
        actorUid: 'uid-admin',
        at: '2026-10-21T08:00:00.000Z',
      }),
    );
  });
});
