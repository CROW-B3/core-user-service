import type { Environment } from '../types';
import pino from 'pino';

const buildProductionTransport = (): pino.TransportSingleOptions => ({
  target: 'pino/file',
  options: { destination: 1 },
});

const buildDevelopmentTransport = (): pino.TransportSingleOptions => ({
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'HH:MM:ss',
    ignore: 'pid,hostname',
  },
});

const determineLogLevel = (env: Environment): pino.Level => {
  const environment = env.ENVIRONMENT || 'prod';

  if (environment === 'local') return 'debug';
  if (environment === 'dev') return 'info';

  return 'warn';
};

const determineTransport = (env: Environment): pino.TransportSingleOptions => {
  const environment = env.ENVIRONMENT || 'prod';
  const isDevelopmentEnvironment =
    environment === 'local' || environment === 'dev';

  return isDevelopmentEnvironment
    ? buildDevelopmentTransport()
    : buildProductionTransport();
};

export const createLogger = (env: Environment): pino.Logger =>
  pino({
    level: determineLogLevel(env),
    transport: determineTransport(env),
    formatters: {
      level: label => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
