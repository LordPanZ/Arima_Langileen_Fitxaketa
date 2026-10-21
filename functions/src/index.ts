/**
 * ARIMA FICHA — Cloud Functions (fase 1).
 *
 * Interfaz completa de las callables, con autenticación, autorización por rol
 * y validación de entrada. El registro de fichajes está DESACTIVADO
 * (CLOCKING_ENABLED=false) hasta completar la fase 2.
 *
 * Nada de esto se ha desplegado. Desplegar requiere plan Blaze (de pago) y
 * autorización expresa: ver SECURITY.md.
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { defineBoolean } from 'firebase-functions/params';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import type { HandlerDeps } from './deps';
import { AppError, HTTPS_CODE } from './errors';
import * as h from './handlers/handlers';

initializeApp();

setGlobalOptions({
  region: 'europe-southwest1',
  maxInstances: 5,
});

const CLOCKING_ENABLED = defineBoolean('CLOCKING_ENABLED', { default: false });

const deps: HandlerDeps = {
  now: () => new Date(),
  clockingEnabled: () => CLOCKING_ENABLED.value(),
  async setRoleClaims(uid, claims) {
    await getAuth().setCustomUserClaims(uid, claims);
  },
  async writeAudit(event) {
    // Fase 2: encadenado por hash dentro de una transacción.
    await getFirestore()
      .collection('auditEvents')
      .add({ ...event, serverAt: FieldValue.serverTimestamp(), previousHash: null, hash: null });
  },
};

type Handler<R> = (auth: CallableRequest['auth'], data: unknown, d: HandlerDeps) => Promise<R>;

function callable<R>(name: string, handler: Handler<R>) {
  return onCall(
    {
      // Fase 2: enforceAppCheck: true
      enforceAppCheck: false,
      cors: true,
    },
    async (request) => {
      try {
        return await handler(request.auth, request.data, deps);
      } catch (err) {
        if (err instanceof AppError) {
          logger.warn(`${name} rechazada`, { code: err.code, uid: request.auth?.uid ?? null });
          throw new HttpsError(HTTPS_CODE[err.code], err.message, {
            code: err.code,
            errors: err.details,
          });
        }
        logger.error(`${name} error interno`, err);
        throw new HttpsError('internal', 'Error interno');
      }
    },
  );
}

export const getServerTime = callable('getServerTime', h.getServerTime);
export const getClockStatus = callable('getClockStatus', h.getClockStatus);
export const recordPunch = callable('recordPunch', h.recordPunch);
export const requestTimeCorrection = callable('requestTimeCorrection', h.requestTimeCorrection);
export const withdrawTimeCorrection = callable('withdrawTimeCorrection', h.withdrawTimeCorrection);
export const reviewTimeCorrection = callable('reviewTimeCorrection', h.reviewTimeCorrection);
export const setUserRole = callable('setUserRole', h.setUserRole);
