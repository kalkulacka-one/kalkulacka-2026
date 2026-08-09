import { db } from '@vk/database';
import type { NextRequest } from 'next/server';
import { HttpError, NotFoundError, UnauthorizedError } from '@/lib/api/http-errors';
import { SessionsDisabledError, sessionsEnabled } from '@/lib/api/sessions-enabled';
import {
  getEmbedNameFromRequest,
  getSessionCookie,
  getSessionFromRequest,
} from '@/lib/session/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ 'calculator-id': string }> },
) {
  try {
    if (!sessionsEnabled()) {
      return new SessionsDisabledError().toResponse();
    }

    const { 'calculator-id': calculatorId } = await params;

    const embedName = getEmbedNameFromRequest(request);
    const cookieData = await getSessionCookie({ embedName });
    const sessionId = cookieData?.id || getSessionFromRequest(request);
    if (!sessionId) {
      return new UnauthorizedError('Session required').toResponse();
    }

    const session = await db().calculatorSession.findUnique({
      where: {
        sessionId_calculatorId: {
          sessionId,
          calculatorId,
        },
      },
    });

    if (!session) {
      return new NotFoundError('Session not found for this calculator').toResponse();
    }

    if (session.publicId) {
      return Response.json({
        publicId: session.publicId,
      });
    }

    const publicId = crypto.randomUUID();

    await db().calculatorSession.update({
      where: {
        id: session.id,
      },
      data: {
        publicId,
      },
    });

    // The OG image route (/api/images/sessions/[public-id]/opengraph) doesn't
    // exist yet — task C3 adds it. The old app fire-and-forgets a warmup
    // fetch here once it does.

    return Response.json({
      publicId,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return error.toResponse();
    }

    throw error;
  }
}
