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

// The account has not confirmed it is 만 19세 or older (lib/age.ts). The client shows the age gate.
export class AgeConfirmationRequiredError extends AppError {
  constructor(message = '만 19세 이상만 이용할 수 있어요. 생년월일을 확인해 주세요.') {
    super(message, { statusCode: 403, code: 'AGE_CONFIRMATION_REQUIRED' });
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
