import { db } from '@vk/database';
import type { NextRequest } from 'next/server';
import { HttpError, NotFoundError } from '@/lib/api/http-errors';
import { SessionsDisabledError, sessionsEnabled } from '@/lib/api/sessions-enabled';
import { isUuid } from '@/lib/session-sync/answer-wire';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ 'public-id': string }> },
) {
  try {
    if (!sessionsEnabled()) {
      return new SessionsDisabledError().toResponse();
    }

    const { 'public-id': publicId } = await params;

    // The column is `@db.Uuid` and Prisma throws on a non-UUID `where` value
    // rather than finding nothing — a typo'd share link must be a 404, not a
    // 500. Same guard as `loadSharedResult`.
    if (!isUuid(publicId)) {
      return new NotFoundError('Session not found').toResponse();
    }

    const session = await db().calculatorSession.findUnique({
      where: { publicId },
      include: { data: true },
    });

    if (!session) {
      return new NotFoundError('Session not found').toResponse();
    }

    if (!session.data) {
      return new NotFoundError('No session data found').toResponse();
    }

    return Response.json({
      publicId: session.publicId,
      calculatorId: session.calculatorId,
      calculatorKey: session.calculatorKey,
      calculatorGroup: session.calculatorGroup,
      calculatorVersion: session.calculatorVersion,
      answers: session.data.answers,
      matches: session.data.result,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return error.toResponse();
    }

    throw error;
  }
}
