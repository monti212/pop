import { logger } from './logger';

export async function initializeObservability(): Promise<void> {
  logger.info('Uhuru Cloud observability initialized');
}

export async function captureException(
  error: Error,
  context?: Record<string, unknown>,
): Promise<void> {
  const component = typeof context?.component === 'string' ? context.component : undefined;
  logger.error('Application runtime failure', error, component ? { component } : undefined);
}

export async function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
): Promise<void> {
  if (level === 'error') logger.error(message);
  else if (level === 'warning') logger.warn(message);
  else logger.info(message);
}
