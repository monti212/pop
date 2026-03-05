import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { logger } from './utils/logger';
import { validateEnvironmentVariables, logEnvironmentStatus } from './utils/envValidator';
import { initializeSentry } from './utils/sentry';
import { ErrorBoundary } from './components/ErrorBoundary';

const isDevelopment = import.meta.env.DEV;

initializeSentry();

if (isDevelopment) {
  logger.info('🚀 Starting Uhuru Application...');
  logEnvironmentStatus();

  const validation = validateEnvironmentVariables();
  if (!validation.valid) {
    logger.error('⚠️  Application started with invalid environment configuration');
  }
}

if (isDevelopment) {
  const sessionId = Date.now();
  const reloadCount = parseInt(sessionStorage.getItem('reloadCount') || '0', 10) + 1;
  sessionStorage.setItem('reloadCount', reloadCount.toString());
  logger.log(`Page Load #${reloadCount} - Session ID: ${sessionId}`);
  logger.log(`Performance: ${performance.now().toFixed(2)}ms`);
}

if (isDevelopment) {
  window.addEventListener('beforeunload', () => {
    logger.debug('Page is about to unload');
  });

  window.addEventListener('unload', () => {
    logger.debug('Page is unloading');
  });
}

let errorCount = 0;
window.addEventListener('error', (e) => {
  errorCount++;
  logger.error(`Global Error #${errorCount}`, {
    message: e.message,
    filename: e.filename,
    line: e.lineno,
    column: e.colno,
    error: e.error
  });
});

window.addEventListener('unhandledrejection', (e) => {
  logger.error('Unhandled Promise Rejection', e.reason);
});

if (isDevelopment && performance.memory) {
  setInterval(() => {
    const memory = performance.memory;
    const used = (memory.usedJSHeapSize / 1048576).toFixed(2);
    const limit = (memory.jsHeapSizeLimit / 1048576).toFixed(2);
    const percent = ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1);

    if (parseFloat(percent) > 90) {
      logger.warn(`Memory Warning: Using ${used}MB / ${limit}MB (${percent}%)`);
    }
  }, 30000);
}

const root = document.getElementById('root')!;

if (isDevelopment) {
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>
  );
} else {
  createRoot(root).render(
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        logger.info('Service Worker registered successfully:', registration.scope);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                logger.info('New service worker available. Refresh to update.');
              }
            });
          }
        });
      })
      .catch((error) => {
        logger.error('Service Worker registration failed:', error);
      });
  });
}