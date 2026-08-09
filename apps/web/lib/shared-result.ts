import 'server-only';
import type { AnswerMap } from '@vk/core';
import { db } from '@vk/database';
import { cache } from 'react';
import { z } from 'zod';
import { answerSchema } from './api/answer-schema';
import { sessionsEnabled } from './api/sessions-enabled';
import { fromWireAnswers, isUuid } from './session-sync/answer-wire';

/**
 * One anonymous session, read by its public id.
 *
 * Read straight from the database rather than through `GET /api/session/…`:
 * the page and the OG image both run on the server, and a self-HTTP call would
 * add a round trip, a base-URL problem, and a second place for the guards to
 * disagree. The route stays for the clients that already call it.
 *
 * Every failure is the same `null` — disabled backend, malformed id, unknown
 * id, a session that was never saved, answers the schema no longer accepts.
 * Callers turn that into `notFound()`/404, which is what all of them mean: a
 * public link either resolves to a result or it does not exist.
 */

export type SharedResult = {
  publicId: string;
  /** The calculator the session was answered against — a platform UUID. */
  calculatorId: string;
  /** Election key on the wire, e.g. "snemovni-2025". `null` on old rows. */
  calculatorGroup: string | null;
  /** The calculator's own key within the election, e.g. "kalkulacka". */
  calculatorKey: string;
  /** The stored wire answers, back in the shape the screens read. */
  answers: AnswerMap;
};

const storedAnswersSchema = z.array(answerSchema);

/**
 * `calculatorId` is the integrity cross-check, not a lookup key: the URL names
 * a calculator and the stored session names one, and a link that pairs one
 * session with another calculator's questions would render a plausible ranking
 * out of two unrelated things. Omitted by the OG route, which has no URL to
 * check against and takes the session's own calculator as the answer.
 */
export const loadSharedResult = cache(
  async (publicId: string, calculatorId?: string): Promise<SharedResult | null> => {
    if (!sessionsEnabled()) return null;

    // The column is `@db.Uuid`; handing prisma anything else throws rather
    // than returning no rows, and a 500 is the wrong answer to a typo'd link.
    if (!isUuid(publicId)) return null;

    const session = await db().calculatorSession.findUnique({
      where: { publicId },
      include: { data: true },
    });

    if (!session?.data) return null;
    if (calculatorId !== undefined && session.calculatorId !== calculatorId) return null;

    const answers = storedAnswersSchema.safeParse(session.data.answers);
    if (!answers.success) return null;

    return {
      publicId,
      calculatorId: session.calculatorId,
      calculatorGroup: session.calculatorGroup,
      calculatorKey: session.calculatorKey,
      answers: fromWireAnswers(answers.data),
    };
  },
);
