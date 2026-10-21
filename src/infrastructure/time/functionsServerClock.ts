import { httpsCallable, type Functions } from 'firebase/functions';
import { FUNCTION_NAMES, type GetServerTimeResponse } from '../../domain/contracts/functionsApi';
import type { ServerClock } from './serverClock';

/** Lee la hora del servidor vía la callable getServerTime. */
export function createFunctionsServerClock(functions: Functions): ServerClock {
  const call = httpsCallable<Record<string, never>, GetServerTimeResponse>(
    functions,
    FUNCTION_NAMES.getServerTime,
  );
  return {
    async read() {
      const before = Date.now();
      const res = await call({});
      const after = Date.now();
      const server = Date.parse(res.data.serverTime);
      const midpoint = before + (after - before) / 2;
      return {
        at: new Date(server + (after - midpoint)),
        source: 'server',
        skewMs: Math.round(midpoint - server),
      };
    },
  };
}
