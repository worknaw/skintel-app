export type AppErrorCode =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'AI_UNAVAILABLE'
  | 'UNKNOWN';

export type AppError = Readonly<{
  code: AppErrorCode;
  message: string;
  retryable: boolean;
}>;

export type Result<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; error: AppError }>;

export function success<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function failure(error: AppError): Result<never> {
  return { ok: false, error };
}
