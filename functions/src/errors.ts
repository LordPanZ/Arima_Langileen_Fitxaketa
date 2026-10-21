import type { AppErrorCode } from '../../src/domain/contracts/functionsApi';

/** Error de aplicación independiente de firebase-functions (testeable). */
export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly details: readonly string[] = [],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export type HttpsErrorCode =
  | 'unauthenticated'
  | 'permission-denied'
  | 'invalid-argument'
  | 'failed-precondition'
  | 'unimplemented';

export const HTTPS_CODE: Readonly<Record<AppErrorCode, HttpsErrorCode>> = {
  UNAUTHENTICATED: 'unauthenticated',
  MISSING_CLAIMS: 'permission-denied',
  FORBIDDEN: 'permission-denied',
  SELF_ROLE_CHANGE: 'permission-denied',
  INVALID_ARGUMENT: 'invalid-argument',
  INVALID_TRANSITION: 'failed-precondition',
  CLOCKING_DISABLED: 'failed-precondition',
  NOT_IMPLEMENTED: 'unimplemented',
};
