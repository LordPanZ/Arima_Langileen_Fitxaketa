import type { PunchType } from '../model/timeEntry';

/**
 * Máquina de estados del fichaje de un trabajador.
 *
 *   off ──clock-in──▶ working ──break-start──▶ on-break
 *    ▲                  │  ▲                      │
 *    └────clock-out─────┘  └──────break-end───────┘
 *
 * La usan la UI (para habilitar botones) y Cloud Functions (para rechazar
 * transiciones inválidas). La validación que cuenta es la del servidor.
 */
export type ClockStatus = 'off' | 'working' | 'on-break';

const TRANSITIONS: Readonly<Record<ClockStatus, Partial<Record<PunchType, ClockStatus>>>> = {
  off: { 'clock-in': 'working' },
  working: { 'break-start': 'on-break', 'clock-out': 'off' },
  // Fichar salida durante una pausa NO se permite: primero hay que cerrar la
  // pausa, para que quede registrada su duración real.
  'on-break': { 'break-end': 'working' },
};

export function allowedPunches(status: ClockStatus): PunchType[] {
  return Object.keys(TRANSITIONS[status]) as PunchType[];
}

export type TransitionResult =
  | { ok: true; next: ClockStatus }
  | { ok: false; error: 'INVALID_TRANSITION'; from: ClockStatus; punch: PunchType };

export function transition(status: ClockStatus, punch: PunchType): TransitionResult {
  const next = TRANSITIONS[status][punch];
  return next
    ? { ok: true, next }
    : { ok: false, error: 'INVALID_TRANSITION', from: status, punch };
}

/** Reconstruye el estado actual a partir de la secuencia de marcas (ordenada). */
export function replay(punches: readonly PunchType[]): TransitionResult {
  let status: ClockStatus = 'off';
  for (const p of punches) {
    const r = transition(status, p);
    if (!r.ok) return r;
    status = r.next;
  }
  return { ok: true, next: status };
}
