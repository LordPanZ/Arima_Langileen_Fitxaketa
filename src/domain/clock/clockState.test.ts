import { describe, expect, it } from 'vitest';
import { allowedPunches, replay, transition } from './clockState';

describe('máquina de estados de fichaje', () => {
  it('flujo completo con pausa', () => {
    expect(replay(['clock-in', 'break-start', 'break-end', 'clock-out'])).toEqual({
      ok: true,
      next: 'off',
    });
  });

  it('acciones permitidas por estado', () => {
    expect(allowedPunches('off')).toEqual(['clock-in']);
    expect(allowedPunches('working').sort()).toEqual(['break-start', 'clock-out']);
    expect(allowedPunches('on-break')).toEqual(['break-end']);
  });

  it('rechaza doble entrada', () => {
    expect(transition('working', 'clock-in')).toMatchObject({
      ok: false,
      error: 'INVALID_TRANSITION',
    });
  });

  it('no permite fichar salida durante una pausa', () => {
    expect(transition('on-break', 'clock-out').ok).toBe(false);
  });

  it('no permite salida sin entrada', () => {
    expect(replay(['clock-out'])).toMatchObject({ ok: false, from: 'off', punch: 'clock-out' });
  });
});
