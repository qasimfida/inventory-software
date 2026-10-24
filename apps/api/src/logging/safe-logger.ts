import type { LoggerService } from '@nestjs/common';

const sensitiveKey =
  /private.?key|prompt|response|completion|api.?key|model.?output|password|passwd|secret|token|authorization|cookie|credential|database.?url|connection.?string|body|headers|sql|query|params|stack|email|phone|address|customer.?name|contact/i;

export function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value instanceof Error) return { name: 'Error', message: '[REDACTED]' };
  if (typeof value === 'string')
    return value
      .replace(
        /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
        '[REDACTED_KEY]',
      )
      .replace(/\b(?:postgres(?:ql)?|https?):\/\/\S+/gi, '[REDACTED_URL]')
      .replace(/\bBearer\s+\S+/gi, 'Bearer [REDACTED]')
      .replace(
        /\b(password|token|secret|authorization|cookie)\s*[:=]\s*[^\s,;]+/gi,
        '$1=[REDACTED]',
      );
  if (value === null || typeof value !== 'object')
    return typeof value === 'bigint' ? String(value) : value;
  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((entry) => redact(entry, seen));
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      sensitiveKey.test(key) ? '[REDACTED]' : redact(entry, seen),
    ]),
  );
}

// Application log sites emit allowlisted metadata, never bodies, SQL or error messages.
export class SafeLogger implements LoggerService {
  constructor(
    private readonly write: (line: string) => void = (line) => {
      process.stdout.write(line);
    },
  ) {}
  private emit(level: string, message: unknown, parameters: unknown[]) {
    this.write(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message: redact(message),
        context: redact(parameters.at(-1)),
      }) + '\n',
    );
  }
  log(message: unknown, ...parameters: unknown[]) {
    this.emit('info', message, parameters);
  }
  error(message: unknown, ...parameters: unknown[]) {
    // Framework error strings may include driver details. Only structured metadata is accepted.
    this.emit(
      'error',
      typeof message === 'string' ? '[REDACTED_ERROR]' : message,
      parameters.length > 1 ? [parameters.at(-1)] : [],
    );
  }
  warn(message: unknown, ...parameters: unknown[]) {
    this.emit('warn', message, parameters);
  }
  debug(message: unknown, ...parameters: unknown[]) {
    this.emit('debug', message, parameters);
  }
  verbose(message: unknown, ...parameters: unknown[]) {
    this.emit('trace', message, parameters);
  }
  fatal(message: unknown, ...parameters: unknown[]) {
    this.error(message, ...parameters);
  }
}
