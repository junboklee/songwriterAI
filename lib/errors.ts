export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, options?: { statusCode?: number; code?: string }) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = options?.statusCode ?? 500;
    this.code = options?.code ?? 'UNKNOWN_ERROR';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(message, { statusCode: 401, code: 'UNAUTHORIZED' });
  }
}

export class RateLimitError extends AppError {
  constructor(message: string) {
    super(message, { statusCode: 429, code: 'RATE_LIMIT_EXCEEDED' });
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, { statusCode: 400, code: 'BAD_REQUEST' });
  }
}
