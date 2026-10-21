import { describe, expect, it } from 'vitest';
import {
  validateRecordPunch,
  validateRequestTimeCorrection,
  validateReviewTimeCorrection,
  validateSetUserRole,
} from './functionsApi';

const uuid = '3f1c2b9e-8d7a-4c6b-9e5f-1a2b3c4d5e6f';

describe('validación del contrato de Cloud Functions', () => {
  it('acepta un fichaje sin evento', () => {
    const r = validateRecordPunch({
      type: 'clock-in',
      eventId: null,
      breakType: null,
      clientReportedAt: '2026-10-21T08:00:00.000Z',
      clientRequestId: uuid,
      note: null,
    });
    expect(r).toEqual({
      ok: true,
      value: expect.objectContaining({ type: 'clock-in', eventId: null }),
    });
  });

  it('rechaza campos extra (p. ej. intentar fijar recordedAt desde el cliente)', () => {
    const r = validateRecordPunch({
      type: 'clock-in',
      clientReportedAt: '2026-10-21T08:00:00.000Z',
      clientRequestId: uuid,
      recordedAt: '2020-01-01T00:00:00.000Z',
    });
    expect(r.ok).toBe(false);
  });

  it('rechaza horas locales sin zona', () => {
    const r = validateRecordPunch({
      type: 'clock-in',
      clientReportedAt: '2026-10-21T10:00:00',
      clientRequestId: uuid,
    });
    expect(r.ok).toBe(false);
  });

  it('pone "rest" por defecto en pausas y rechaza breakType en entradas', () => {
    const ok = validateRecordPunch({
      type: 'break-start',
      clientReportedAt: '2026-10-21T08:00:00.000Z',
      clientRequestId: uuid,
    });
    expect(ok.ok && ok.value.breakType).toBe('rest');
    const bad = validateRecordPunch({
      type: 'clock-in',
      breakType: 'meal',
      clientReportedAt: '2026-10-21T08:00:00.000Z',
      clientRequestId: uuid,
    });
    expect(bad.ok).toBe(false);
  });

  it('exige motivo y entrada objetivo en correcciones', () => {
    expect(
      validateRequestTimeCorrection({
        employeeId: 'emp-1',
        kind: 'adjust-time',
        targetEntryId: null,
        punchType: 'clock-out',
        proposedAt: '2026-10-21T15:00:00.000Z',
        reason: 'Olvidé fichar la salida al terminar el tour',
        clientRequestId: uuid,
      }).ok,
    ).toBe(false);
    expect(
      validateRequestTimeCorrection({
        employeeId: 'emp-1',
        kind: 'add-missing',
        targetEntryId: null,
        punchType: 'clock-out',
        proposedAt: '2026-10-21T15:00:00.000Z',
        reason: 'corto',
        clientRequestId: uuid,
      }).ok,
    ).toBe(false);
    expect(
      validateRequestTimeCorrection({
        employeeId: 'emp-1',
        kind: 'add-missing',
        targetEntryId: null,
        punchType: 'clock-out',
        proposedAt: '2026-10-21T15:00:00.000Z',
        reason: 'Olvidé fichar la salida al terminar el tour',
        clientRequestId: uuid,
      }).ok,
    ).toBe(true);
  });

  it('la revisión exige comentario', () => {
    expect(
      validateReviewTimeCorrection({ correctionId: 'c1', decision: 'approve', comment: '' }).ok,
    ).toBe(false);
    expect(
      validateReviewTimeCorrection({
        correctionId: 'c1',
        decision: 'approve',
        comment: 'Confirmado con coordinación',
      }).ok,
    ).toBe(true);
  });

  it('solo acepta roles conocidos', () => {
    expect(validateSetUserRole({ targetUid: 'u1', employeeId: 'e1', role: 'root' }).ok).toBe(false);
    expect(validateSetUserRole({ targetUid: 'u1', employeeId: 'e1', role: 'auditor' }).ok).toBe(
      true,
    );
  });
});
