import type { Environment } from '../types';

const REQUIRED_ENVIRONMENT_VARIABLES = [
  'BETTER_AUTH_SECRET',
  'AUTH_SERVICE_URL',
] as const;

const findMissingEnvironmentVariables = (env: Partial<Environment>): string[] =>
  REQUIRED_ENVIRONMENT_VARIABLES.filter(key => {
    const value = env[key as keyof Environment];
    return value === undefined || value === null;
  });

const findEmptyEnvironmentVariables = (env: Partial<Environment>): string[] =>
  REQUIRED_ENVIRONMENT_VARIABLES.filter(key => {
    const value = env[key as keyof Environment];
    return typeof value === 'string' && value.trim() === '';
  });

const buildValidationErrorMessages = (
  missing: string[],
  empty: string[]
): string[] => {
  const errors: string[] = [];
  if (missing.length > 0) {
    errors.push(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
  if (empty.length > 0) {
    errors.push(`Empty environment variables: ${empty.join(', ')}`);
  }
  return errors;
};

export function validateEnvironmentVariables(env: Partial<Environment>): void {
  const missingVariables = findMissingEnvironmentVariables(env);
  const emptyVariables = findEmptyEnvironmentVariables(env);
  const validationErrors = buildValidationErrorMessages(
    missingVariables,
    emptyVariables
  );

  if (validationErrors.length === 0) return;

  throw new Error(
    `Environment validation failed:\n${validationErrors.join('\n')}\n\n` +
      'Please ensure all required environment variables are set in your .env file or deployment configuration.'
  );
}

export const determineEnvironmentType = (
  env: Environment
): 'local' | 'dev' | 'prod' =>
  (env.ENVIRONMENT as 'local' | 'dev' | 'prod') || 'prod';

export const isProductionEnvironment = (env: Environment): boolean =>
  determineEnvironmentType(env) === 'prod';

export const isDevelopmentEnvironment = (env: Environment): boolean => {
  const environmentType = determineEnvironmentType(env);
  return environmentType === 'dev' || environmentType === 'local';
};
