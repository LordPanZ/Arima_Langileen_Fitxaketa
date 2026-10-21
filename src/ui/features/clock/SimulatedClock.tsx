import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { allowedPunches, transition, type ClockStatus } from '../../../domain/clock/clockState';
import type { PunchType } from '../../../domain/model/timeEntry';
import type { UtcInstant } from '../../../domain/model/ids';
import { toUtcInstant } from '../../../domain/time/zone';

/**
 * SIMULACIÓN DEL FLUJO DE FICHAJE (fase 1).
 *
 * Usa la misma máquina de estados que usará el backend, pero todo vive en
 * memoria del navegador: no se envía nada, no se guarda nada y se pierde al
 * recargar. NO es un registro horario.
 */
export interface SimulatedPunch {
  type: PunchType;
  /** Hora del DISPOSITIVO: en un fichaje real la fijará el servidor. */
  deviceAt: UtcInstant;
  eventId: string | null;
}

interface SimulatedClockState {
  status: ClockStatus;
  punches: readonly SimulatedPunch[];
  allowed: readonly PunchType[];
  simulate(type: PunchType, eventId: string | null): { ok: boolean };
  reset(): void;
}

const Ctx = createContext<SimulatedClockState | null>(null);

export function SimulatedClockProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ClockStatus>('off');
  const [punches, setPunches] = useState<SimulatedPunch[]>([]);

  const simulate = useCallback(
    (type: PunchType, eventId: string | null) => {
      const r = transition(status, type);
      if (!r.ok) return { ok: false };
      setStatus(r.next);
      setPunches((p) => [...p, { type, deviceAt: toUtcInstant(new Date()), eventId }]);
      return { ok: true };
    },
    [status],
  );

  const reset = useCallback(() => {
    setStatus('off');
    setPunches([]);
  }, []);

  const value = useMemo(
    () => ({ status, punches, allowed: allowedPunches(status), simulate, reset }),
    [status, punches, simulate, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSimulatedClock(): SimulatedClockState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSimulatedClock fuera de SimulatedClockProvider');
  return v;
}
