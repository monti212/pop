export type ObservabilitySeverity = 'low' | 'medium' | 'high' | 'critical';
export type ObservabilityCategory =
  | 'runtime'
  | 'network'
  | 'database'
  | 'authentication'
  | 'validation'
  | 'performance'
  | 'system'
  | 'unknown';

interface SafeEvent {
  fingerprint: string;
  title: string;
  summary: string | null;
  severity: ObservabilitySeverity;
  category: ObservabilityCategory;
  source: string;
  route: string | null;
  context: Record<string, string | number>;
  stack: string | null;
}

type ConsoleLevel = 'debug' | 'info' | 'warn' | 'error';
type QueuedConsoleEvent = { level: ConsoleLevel; args: unknown[]; timestamp: number };

const isDevelopment = import.meta.env.DEV;
const recentEvents = new Map<string, number>();
const REDACTION_PATTERNS: Array<[RegExp, string]> = [
  [/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, '[credential redacted]'],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[credential redacted]'],
  [/(token|secret|password|api[_ -]?key|authorization)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email redacted]'],
  [/https?:\/\/[^\s]+/gi, '[internal location redacted]'],
];

function sanitizeText(value: string, limit = 1000): string {
  return REDACTION_PATTERNS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value.slice(0, limit),
  );
}

function valueToText(value: unknown): string {
  if (value instanceof Error) return `${value.name} raised`;
  if (typeof value === 'string') return '[string omitted]';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return '';
  // Arbitrary objects often contain request bodies, profiles, or credentials.
  // Preserve their shape for diagnosis without preserving their values.
  if (Array.isArray(value)) return `[array with ${value.length} items]`;
  if (typeof value === 'object') return `[object with ${Object.keys(value as object).length} fields]`;
  return `[${typeof value}]`;
}

function safeTitle(value: unknown, category: ObservabilityCategory): string {
  if (value instanceof Error) return `${value.name} application failure`;
  if (typeof value !== 'string') return `Application ${category} event`;

  const candidate = sanitizeText(value.replace(/\s+/g, ' ').trim(), 180);
  const operationalLabel =
    /\b(error|fail(?:ed|ure)?|unable|missing|invalid|unhandled|exception|warning|network|database|auth(?:entication)?|runtime|system|request|response|upload|download|service|worker|memory|performance|config(?:uration)?|session|storage|render)\b/i;
  if (
    !operationalLabel.test(candidate)
    || /[{}[\]]/.test(candidate)
    || candidate.length < 4
  ) {
    return `Application ${category} event`;
  }
  return candidate;
}

function safeStack(error: Error | undefined): string | null {
  if (!error?.stack) return null;
  const frames = error.stack
    .split('\n')
    .slice(1, 16)
    .filter((line) => /^\s*at\s/.test(line))
    .join('\n');
  return frames ? sanitizeText(frames, 3000) : null;
}

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return `evt_${(result >>> 0).toString(16).padStart(8, '0')}`;
}

function classify(text: string): ObservabilityCategory {
  const normalized = text.toLowerCase();
  if (/auth|session|sign.?in|permission|unauthor/.test(normalized)) return 'authentication';
  if (/fetch|network|request|response|http|upload|download/.test(normalized)) return 'network';
  if (/database|query|insert|update|storage|record/.test(normalized)) return 'database';
  if (/valid|invalid|required|format/.test(normalized)) return 'validation';
  if (/performance|memory|slow|timeout/.test(normalized)) return 'performance';
  if (/render|component|boundary|javascript|runtime/.test(normalized)) return 'runtime';
  if (/config|worker|environment|system/.test(normalized)) return 'system';
  return 'unknown';
}

function severityFor(level: ConsoleLevel, text: string): ObservabilitySeverity {
  if (/\bcritical|fatal|data loss|security\b/i.test(text)) return 'critical';
  if (level === 'error') return 'high';
  if (level === 'warn') return 'medium';
  return 'low';
}

function buildEvent(level: ConsoleLevel, args: unknown[]): SafeEvent {
  const error = args.find((value): value is Error => value instanceof Error);
  const classificationHint =
    typeof args[0] === 'string' ? sanitizeText(args[0], 240) : error?.name || 'application';
  const category = classify(classificationHint);
  const title = safeTitle(args[0], category);
  const supporting = args.slice(1).map(valueToText).filter(Boolean);
  const summary = supporting.length ? sanitizeText(supporting.join(' · '), 500) : null;
  const route = typeof window === 'undefined' ? null : window.location.pathname.slice(0, 200);
  const source = category === 'unknown' ? 'application' : category;
  const stack = safeStack(error);
  const firstFrame = stack?.split('\n')[0] || '';
  const normalized = `${level}|${category}|${title.replace(/\d+/g, '#')}|${route || ''}|${firstFrame}`;

  return {
    fingerprint: hash(normalized),
    title,
    summary,
    severity: severityFor(level, classificationHint),
    category,
    source,
    route,
    context: {
      errorName: error?.name || 'ApplicationEvent',
      viewport: typeof window === 'undefined' ? '' : `${window.innerWidth}x${window.innerHeight}`,
      release: import.meta.env.VITE_APP_VERSION || '0.1.0',
    },
    stack,
  };
}

function publish(level: ConsoleLevel, args: unknown[]): void {
  if (isDevelopment) return;
  const event = buildEvent(level, args);
  const now = Date.now();
  const lastSent = recentEvents.get(event.fingerprint) || 0;
  if (now - lastSent < 15_000) return;
  recentEvents.set(event.fingerprint, now);

  if (recentEvents.size > 250) {
    for (const [fingerprint, timestamp] of recentEvents) {
      if (now - timestamp > 300_000) recentEvents.delete(fingerprint);
    }
  }

  void import('../services/errorLogService')
    .then(({ errorLogService }) => errorLogService.capture(event))
    .catch(() => undefined);
}

const developmentConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
};

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) developmentConsole.log(...args);
    publish('info', args);
  },
  info: (...args: unknown[]) => {
    if (isDevelopment) developmentConsole.info(...args);
    publish('info', args);
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) developmentConsole.warn(...args);
    publish('warn', args);
  },
  error: (...args: unknown[]) => {
    if (isDevelopment) developmentConsole.error(...args);
    publish('error', args);
  },
  debug: (...args: unknown[]) => {
    if (isDevelopment) developmentConsole.debug('[DEBUG]', ...args);
    publish('debug', args);
  },
};

if (!isDevelopment) {
  const runtime = globalThis as typeof globalThis & {
    __UHURU_OBSERVABILITY_QUEUE__?: QueuedConsoleEvent[];
    __UHURU_OBSERVABILITY_CAPTURE__?: (event: QueuedConsoleEvent) => void;
  };
  runtime.__UHURU_OBSERVABILITY_CAPTURE__ = (event) => publish(event.level, event.args);
  const queued = runtime.__UHURU_OBSERVABILITY_QUEUE__?.splice(0) ?? [];
  queued.forEach((event) => publish(event.level, event.args));
}
