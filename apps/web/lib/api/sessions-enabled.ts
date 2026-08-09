import { HttpError } from './http-errors';

/**
 * Forks and local checkouts run with no backend configured at all — the
 * session routes must degrade to a clean 503 rather than let prisma throw on
 * a missing `DATABASE_URL` (see `@vk/database`'s `db()`).
 */
export function sessionsEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME);
}

export class SessionsDisabledError extends HttpError {
  constructor() {
    super('Sessions are not configured on this deployment', 503, 'errors/sessions-disabled');
  }
}
