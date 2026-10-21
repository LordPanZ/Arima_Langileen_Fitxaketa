export interface ServerTimeReading {
  /** Hora de referencia. */
  at: Date;
  /** "server": la dio Cloud Functions; "device": reloj local (solo demo). */
  source: 'server' | 'device';
  /** Desfase estimado dispositivo − servidor en ms (null si no aplica). */
  skewMs: number | null;
}

export interface ServerClock {
  read(): Promise<ServerTimeReading>;
}

/** Modo demo: no hay servidor. Se indica explícitamente en la UI. */
export const deviceClock: ServerClock = {
  async read() {
    return { at: new Date(), source: 'device', skewMs: null };
  },
};
