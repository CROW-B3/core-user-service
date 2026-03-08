import type { Context } from 'hono';
import type pino from 'pino';
import { tryCatch } from '@d3avarja/try-catch';

export interface ServiceError {
  statusCode: number;
  code: string;
  message: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    timestamp: string;
  };
}

const isServiceError = (error: unknown): error is ServiceError =>
  typeof error === 'object' && error !== null;

const buildErrorResponse = (code: string, message: string): ErrorResponse => ({
  error: {
    code,
    message,
    timestamp: new Date().toISOString(),
  },
});

const isZodValidationError = (error: unknown): boolean =>
  isServiceError(error) && (error as { name?: string }).name === 'ZodError';

const isMalformedJsonError = (error: unknown): boolean => {
  if (!isServiceError(error)) return false;
  const { name, message } = error as { name?: string; message?: string };
  if (name === 'SyntaxError') return true;
  if (typeof message !== 'string') return false;
  return (
    message.includes('Malformed JSON') ||
    message.includes('Unexpected end of JSON') ||
    message.includes('Unexpected token')
  );
};

const extractStatusCodeFromError = (error: unknown): number => {
  if (isZodValidationError(error)) return 400;
  if (isMalformedJsonError(error)) return 400;
  if (!isServiceError(error) || !('statusCode' in error)) return 500;

  const statusCode = (error as ServiceError).statusCode;
  return typeof statusCode === 'number' ? statusCode : 500;
};

const extractErrorCodeFromError = (error: unknown): string => {
  if (!isServiceError(error) || !('code' in error)) return 'INTERNAL_ERROR';

  const code = (error as ServiceError).code;
  return typeof code === 'string' ? code : 'INTERNAL_ERROR';
};

const extractMessageFromError = (error: unknown): string => {
  if (typeof error === 'string') return error;

  if (!isServiceError(error) || !('message' in error))
    return 'An unexpected error occurred';

  const message = (error as ServiceError).message;
  return typeof message === 'string' ? message : 'An unexpected error occurred';
};

const logErrorWithContext = (
  logger: pino.Logger,
  error: unknown,
  context?: string
): void => {
  const errorMessage = extractMessageFromError(error);
  const errorCode = extractErrorCodeFromError(error);
  const logPayload = context
    ? { error, code: errorCode, context }
    : { error, code: errorCode };

  logger.error(logPayload, errorMessage);
};

export const handleErrorResponse = (
  c: Context,
  error: unknown,
  logger: pino.Logger
) => {
  const statusCode = extractStatusCodeFromError(error);
  const code = extractErrorCodeFromError(error);
  const message = extractMessageFromError(error);

  logErrorWithContext(logger, error);

  return c.json(
    buildErrorResponse(code, message),
    statusCode as Parameters<typeof c.json>[1]
  );
};

export const createServiceError = (
  statusCode: number,
  code: string,
  message: string
): ServiceError => ({
  statusCode,
  code,
  message,
});

export const wrapAsyncHandler = <T>(
  handler: () => Promise<T>
): Promise<[T, null] | [null, Error]> => {
  return tryCatch(handler()) as unknown as Promise<[T, null] | [null, Error]>;
};
