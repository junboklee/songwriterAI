type LogLevel = 'info' | 'warn' | 'error';

type LogMetadata = Record<string, unknown>;

const log = (level: LogLevel, event: string, metadata: LogMetadata = {}) => {
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...metadata
  };

  // eslint-disable-next-line no-console
  console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info'](
    JSON.stringify(payload)
  );
};

export const logInfo = (event: string, metadata?: LogMetadata) => log('info', event, metadata);

export const logWarn = (event: string, metadata?: LogMetadata) => log('warn', event, metadata);

export const logError = (
  event: string,
  error: unknown,
  metadata: LogMetadata = {}
) => {
  const baseMetadata: LogMetadata = {
    ...metadata
  };

  if (error instanceof Error) {
    baseMetadata.message = error.message;
    baseMetadata.stack = error.stack;
    baseMetadata.name = error.name;
  } else {
    baseMetadata.error = error;
  }

  log('error', event, baseMetadata);
};
