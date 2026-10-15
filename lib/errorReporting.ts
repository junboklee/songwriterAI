// Browser error reporting to /api/client-errors (server log / Cloud Logging).
// Sends at most MAX_REPORTS distinct errors per page load and skips known browser noise.

export type ClientErrorKind = 'error' | 'unhandledrejection' | 'react';

const MAX_REPORTS = 5;
const IGNORED = [
  /ResizeObserver loop/i, // harmless layout notification
  /^Script error\.?$/i, // cross-origin script without details (ads, extensions)
  /chrome-extension:|moz-extension:/i
];

const sent = new Set<string>();

export function shouldReport(message: string, stack?: string | null) {
  if (!message || sent.size >= MAX_REPORTS) {
    return false;
  }
  if (IGNORED.some(pattern => pattern.test(message) || (stack ? pattern.test(stack) : false))) {
    return false;
  }
  return !sent.has(message);
}

export function reportClientError(kind: ClientErrorKind, error: unknown) {
  if (typeof window === 'undefined') {
    return;
  }
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);
  const stack = error instanceof Error ? error.stack?.split('\n').slice(0, 8).join('\n') ?? null : null;
  if (!shouldReport(message, stack)) {
    return;
  }
  sent.add(message);

  const payload = JSON.stringify({ kind, message, stack, path: window.location.pathname });
  try {
    // sendBeacon survives page unloads; fall back to fetch when it is unavailable or refused.
    const queued = navigator.sendBeacon?.('/api/client-errors', new Blob([payload], { type: 'application/json' }));
    if (!queued) {
      void fetch('/api/client-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(() => undefined);
    }
  } catch {
    // Reporting must never throw into the app.
  }
}

let installed = false;

export function installGlobalErrorHandlers() {
  if (installed || typeof window === 'undefined') {
    return;
  }
  installed = true;
  window.addEventListener('error', event => reportClientError('error', event.error ?? event.message));
  window.addEventListener('unhandledrejection', event => reportClientError('unhandledrejection', event.reason));
}

// Test helper.
export function resetErrorReportingForTests() {
  sent.clear();
}
