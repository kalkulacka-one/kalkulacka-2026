import type { AnswerMap } from '@vk/core';
import type { Answer } from '../api/answer-schema';

/**
 * The domain answer map ↔ the stored wire format.
 *
 * The wire entry has two optional fields (`answer`, `isImportant`); the domain
 * entry has three (`answer`, `isImportant`, `skipped`). The whole difficulty is
 * fitting the third one through, and this is where it is decided:
 *
 * | domain (`UserAnswer`)                        | wire (`Answer`)                     |
 * | -------------------------------------------- | ----------------------------------- |
 * | `answer: true \| false`, `skipped: false`     | `{ answer: true \| false }`         |
 * | `answer: undefined`, `skipped: true`          | `{ answer: null }`                  |
 * | `answer: undefined`, `skipped: false`, important | `{ }` — no `answer` key          |
 * | `answer: undefined`, `skipped: false`, not important | dropped                     |
 * | `isImportant: true`                           | `isImportant: true`                 |
 * | `isImportant: false`                          | omitted                             |
 *
 * So an explicit skip is `answer: null` and an importance star armed before any
 * position is an entry with no `answer` key at all — the two states the round
 * trip has to keep apart, and the two the wire's own shape does not distinguish
 * on its own.
 *
 * `null` on the wire is the old platform's *explicit neutral* ("nevím"), and
 * claiming it for `skipped` is a deliberate, contained lie: the question card
 * offers agree and disagree only, so nothing in this app produces a neutral
 * user answer, and these rows are only ever read back by this app (candidates'
 * imported neutrals live in the calculator data, not in a session). Should the
 * flow ever gain a real "nevím" button, this encoding has to change first — a
 * skip and a neutral would then both be live and would collide here.
 *
 * The last row is dropped rather than encoded because it is
 * indistinguishable from never having reached the question: nothing counts it,
 * nothing draws it, and `firstUnansweredIndex` walks straight past it.
 */

/** The DB column is `@db.Uuid` and the wire schema is `z.uuid()`; anything else is not ours to send. */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * Answers as the server stores them.
 *
 * Entries whose question id is not a UUID are dropped: the server rejects the
 * whole array otherwise, and one stale localStorage entry from a differently
 * sourced calculator would silently cost the user every save from then on.
 */
export function toWireAnswers(answers: AnswerMap): Answer[] {
  const wire: Answer[] = [];

  for (const entry of Object.values(answers)) {
    if (!isUuid(entry.questionId)) continue;

    const important = entry.isImportant === true ? { isImportant: true } : {};

    if (entry.answer !== undefined) {
      wire.push({ questionId: entry.questionId, answer: entry.answer, ...important });
      continue;
    }

    if (entry.skipped === true) {
      wire.push({ questionId: entry.questionId, answer: null, ...important });
      continue;
    }

    if (entry.isImportant === true) {
      wire.push({ questionId: entry.questionId, ...important });
    }
  }

  return wire;
}

/**
 * The stored answers as the store holds them.
 *
 * Fields are written out in full rather than left optional so an adopted map is
 * shaped exactly like one the store's own transitions produce — otherwise the
 * two would differ only in ways nothing reads, which is the kind of difference
 * that eventually gets read.
 */
export function fromWireAnswers(entries: readonly Answer[]): AnswerMap {
  const answers: AnswerMap = {};

  for (const entry of entries) {
    const isImportant = entry.isImportant === true;

    if (entry.answer === true || entry.answer === false) {
      answers[entry.questionId] = {
        questionId: entry.questionId,
        answer: entry.answer,
        isImportant,
        skipped: false,
      };
      continue;
    }

    answers[entry.questionId] = {
      questionId: entry.questionId,
      answer: undefined,
      isImportant,
      // `null` is a skip; an absent `answer` key is a star armed before answering.
      skipped: entry.answer === null,
    };
  }

  return answers;
}
