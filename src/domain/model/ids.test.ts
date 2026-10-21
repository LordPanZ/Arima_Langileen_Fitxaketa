import { describe, expect, it } from 'vitest';
import { asId, isLocalDate, isStableId, isUtcInstant } from './ids';
import type { EmployeeId } from './ids';

describe('identificadores y fechas', () => {
  it('acepta solo instantes UTC canónicos', () => {
    expect(isUtcInstant('2026-10-21T08:00:00.000Z')).toBe(true);
    expect(isUtcInstant('2026-10-21T10:00:00+02:00')).toBe(false);
    expect(isUtcInstant('2026-10-21T08:00:00Z')).toBe(false);
    expect(isUtcInstant('2026-10-21 08:00')).toBe(false);
  });

  it('valida fechas locales reales', () => {
    expect(isLocalDate('2026-02-28')).toBe(true);
    expect(isLocalDate('2026-02-30')).toBe(false);
    expect(isLocalDate('21/10/2026')).toBe(false);
  });

  it('rechaza IDs inseguros para Firestore', () => {
    expect(isStableId('emp-0001')).toBe(true);
    expect(isStableId('a/b')).toBe(false);
    expect(isStableId('__name__')).toBe(false);
    expect(isStableId('')).toBe(false);
    expect(() => asId<EmployeeId>('../x')).toThrow();
  });
});
