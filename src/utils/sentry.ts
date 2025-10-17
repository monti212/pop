import { logger } from './logger';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const APP_ENVIRONMENT = import.meta.env.MODE || 'development';
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.1.0';

let Sentry: any = null;
let sentryInitialized = false;

async function loadSentry() {
  if (!Sentry) {
    try {
      Sentry = await import('@sentry/react');
      return Sentry;
    } catch (error) {
      logger.warn('Sentry package not available. Error tracking is disabled.');
      return null;
    }
  }
  return Sentry;
}

export async function initializeSentry() {
  if (!SENTRY_DSN || SENTRY_DSN.includes('your-dsn')) {
    if (APP_ENVIRONMENT === 'production') {
      logger.warn('⚠️  Sentry DSN not configured. Error tracking is disabled.');
    } else {
      logger.info('ℹ️  Sentry not configured for development environment.');
    }
    return;
  }

  const SentryModule = await loadSentry();
  if (!SentryModule) return;

  try {
    SentryModule.init({
      dsn: SENTRY_DSN,
      environment: APP_ENVIRONMENT,
      release: `uhuru@${APP_VERSION}`,

      integrations: [
        SentryModule.browserTracingIntegration(),
        SentryModule.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],

      tracesSampleRate: APP_ENVIRONMENT === 'production' ? 0.1 : 1.0,

      replaysSessionSampleRate: APP_ENVIRONMENT === 'production' ? 0.1 : 0,

      replaysOnErrorSampleRate: 1.0,

      beforeSend(event: any, hint: any) {
        const error = hint.originalException;

        if (typeof error === 'string' && error.toLowerCase().includes('network')) {
          return null;
        }

        if (error instanceof Error) {
          if (error.message.includes('ResizeObserver loop')) {
            return null;
          }

          if (error.message.includes('Script error')) {
            return null;
          }

          if (error.message.includes('cancelled') || error.message.includes('aborted')) {
            return null;
          }
        }

        return event;
      },

      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        'Non-Error promise rejection captured',
        'Network request failed',
        'Failed to fetch',
        'Load failed',
        'cancelled',
        'AbortError',
        /^Script error\.?$/,
        /^Uncaught NetworkError/,
      ],

      denyUrls: [
        /extensions\//i,
        /^chrome:\/\//i,
        /^chrome-extension:\/\//i,
        /^moz-extension:\/\//i,
      ],
    });

    sentryInitialized = true;
    logger.info('✓ Sentry error tracking initialized');
  } catch (error) {
    logger.error('Failed to initialize Sentry:', error);
  }
}

export async function captureException(error: Error, context?: Record<string, any>) {
  const SentryModule = await loadSentry();

  if (SentryModule && sentryInitialized && SENTRY_DSN && !SENTRY_DSN.includes('your-dsn')) {
    SentryModule.captureException(error, {
      contexts: context ? { custom: context } : undefined,
    });
  }

  logger.error('Exception captured:', error, context);
}

export async function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  const SentryModule = await loadSentry();

  if (SentryModule && sentryInitialized && SENTRY_DSN && !SENTRY_DSN.includes('your-dsn')) {
    SentryModule.captureMessage(message, level);
  }

  logger.log(`[${level}] ${message}`);
}

export async function setUserContext(user: { id: string; email?: string; username?: string }) {
  const SentryModule = await loadSentry();

  if (SentryModule && sentryInitialized && SENTRY_DSN && !SENTRY_DSN.includes('your-dsn')) {
    SentryModule.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  }
}

export async function clearUserContext() {
  const SentryModule = await loadSentry();

  if (SentryModule && sentryInitialized && SENTRY_DSN && !SENTRY_DSN.includes('your-dsn')) {
    SentryModule.setUser(null);
  }
}

export async function addBreadcrumb(message: string, category?: string, data?: Record<string, any>) {
  const SentryModule = await loadSentry();

  if (SentryModule && sentryInitialized && SENTRY_DSN && !SENTRY_DSN.includes('your-dsn')) {
    SentryModule.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
    });
  }
}

export { Sentry };
