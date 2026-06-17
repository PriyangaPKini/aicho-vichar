type LogLevel = 'error' | 'warn' | 'info';

interface LogClientErrorOptions {
  level?: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export function logClientError({ level = 'error', message, context = {} }: LogClientErrorOptions) {
  console[level]('[client]', message, context);

  if (typeof navigator === 'undefined') return;

  const payload = {
    level,
    message,
    context,
    path: window.location.pathname,
    userAgent: navigator.userAgent,
  };

  void fetch('/.netlify/functions/log-error', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch((err) => {
    console.error('[client] failed to send log:', err);
  });
}
