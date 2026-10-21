import { describe, expect, it } from 'vitest';
import type { LocalDate, UtcInstant } from '../model/ids';
import {
  AmbiguousOrInvalidLocalTimeError,
  formatInMadrid,
  madridLocalDate,
  madridWallTimeToUtc,
  minutesBetween,
  toUtcInstant,
  zoneOffsetMinutes,
} from './zone';

const u = (s: string) => s as UtcInstant;
const d = (s: string) => s as LocalDate;

describe('zona Europe/Madrid', () => {
  it('normaliza a UTC con milisegundos y Z', () => {
    expect(toUtcInstant(new Date('2026-10-21T10:00:00+02:00'))).toBe('2026-10-21T08:00:00.000Z');
  });

  it('calcula el desfase de invierno (+60) y verano (+120)', () => {
    expect(zoneOffsetMinutes(new Date('2026-01-15T12:00:00Z'))).toBe(60);
    expect(zoneOffsetMinutes(new Date('2026-07-15T12:00:00Z'))).toBe(120);
  });

  it('asigna el día natural de Madrid, no el de UTC', () => {
    // 23:30 UTC del 21 de octubre = 01:30 del 22 en Madrid (verano)
    expect(madridLocalDate(u('2026-10-21T23:30:00.000Z'))).toBe('2026-10-22');
    expect(madridLocalDate(u('2026-01-21T22:59:00.000Z'))).toBe('2026-01-21');
    expect(madridLocalDate(u('2026-01-21T23:00:00.000Z'))).toBe('2026-01-22');
  });

  it('convierte hora de pared de Madrid a UTC', () => {
    expect(madridWallTimeToUtc(d('2026-07-01'), '09:00')).toBe('2026-07-01T07:00:00.000Z');
    expect(madridWallTimeToUtc(d('2026-12-01'), '09:00')).toBe('2026-12-01T08:00:00.000Z');
  });

  it('rechaza la hora inexistente del cambio a horario de verano (29-03-2026)', () => {
    expect(() => madridWallTimeToUtc(d('2026-03-29'), '02:30')).toThrow(
      AmbiguousOrInvalidLocalTimeError,
    );
    expect(madridWallTimeToUtc(d('2026-03-29'), '03:00')).toBe('2026-03-29T01:00:00.000Z');
  });

  it('detecta la hora ambigua del cambio a horario de invierno (25-10-2026)', () => {
    expect(() => madridWallTimeToUtc(d('2026-10-25'), '02:30')).toThrow(/ambigua/);
    expect(madridWallTimeToUtc(d('2026-10-25'), '02:30', { prefer: 'earlier' })).toBe(
      '2026-10-25T00:30:00.000Z',
    );
    expect(madridWallTimeToUtc(d('2026-10-25'), '02:30', { prefer: 'later' })).toBe(
      '2026-10-25T01:30:00.000Z',
    );
  });

  it('mide la duración real en la noche del cambio de hora (1 h extra)', () => {
    const start = madridWallTimeToUtc(d('2026-10-24'), '22:00');
    const end = madridWallTimeToUtc(d('2026-10-25'), '06:00');
    // De 22:00 a 06:00 de pared son 8 h, pero esa noche dura 9 h reales.
    expect(minutesBetween(start, end)).toBe(9 * 60);
  });

  it('formatea en castellano y euskera con hora de Madrid', () => {
    const t = u('2026-10-21T07:05:00.000Z');
    expect(formatInMadrid(t, 'es', 'time')).toBe('09:05');
    expect(formatInMadrid(t, 'eu', 'time')).toBe('09:05');
    expect(formatInMadrid(t, 'es', 'date')).toBe('21/10/2026');
  });
});
