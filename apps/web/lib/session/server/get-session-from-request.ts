import type { NextRequest } from 'next/server';
import { isUuid } from '../../session-sync/answer-wire';

/**
 * A session id heads straight for a `@db.Uuid` column, and Prisma throws on a
 * non-UUID `where` value rather than finding nothing — a 500 instead of a 401.
 * So a malformed token is treated as no token at all.
 */
export function getSessionFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  const bearer = auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;
  return bearer && isUuid(bearer) ? bearer : null;
}
