import type { ZodError } from 'zod';

/**
 * Wire format matches the old production API (`application/problem+json`,
 * RFC 7807-shaped body) — clients and the shared cookie contract depend on
 * these exact fields and status codes.
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly type: string,
    public readonly instance?: string,
    public readonly extensions?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toResponse(): Response {
    const body: Record<string, unknown> = {
      type: this.type,
      title: this.message,
      status: this.statusCode,
    };

    if (this.instance) {
      body.instance = this.instance;
    }

    if (this.extensions) {
      Object.assign(body, this.extensions);
    }

    return new Response(JSON.stringify(body), {
      status: this.statusCode,
      headers: { 'Content-Type': 'application/problem+json' },
    });
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'errors/unauthorized');
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not Found') {
    super(message, 404, 'errors/not-found');
  }
}

export class JsonParseError extends HttpError {
  constructor() {
    super('Bad Request', 400, 'errors/json-parse');
  }
}

export class ValidationError extends HttpError {
  constructor(zodError: ZodError) {
    const errors = zodError.issues.map((error) => ({
      field: error.path.join('.'),
      message: error.message,
    }));

    super('Bad Request', 400, 'errors/validation', undefined, { errors });
  }
}

export class InternalServerError extends HttpError {
  constructor(message = 'Internal Server Error') {
    super(message, 500, 'errors/internal');
  }
}

export class BadGatewayError extends HttpError {
  constructor(message = 'Bad Gateway') {
    super(message, 502, 'errors/bad-gateway');
  }
}

export class GatewayTimeoutError extends HttpError {
  constructor(message = 'Gateway Timeout') {
    super(message, 504, 'errors/gateway-timeout');
  }
}
