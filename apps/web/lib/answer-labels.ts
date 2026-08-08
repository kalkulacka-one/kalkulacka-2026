import type { AnswerValue } from '@vk/core';
import { getMessages } from '@vk/i18n';

const messages = getMessages();

/**
 * How an answer reads aloud — the accessible name behind an `AnswerMark`.
 *
 * The mark is a bare coloured circle, so this string *is* the answer as far as
 * a screen reader is concerned. It had been written out separately in the
 * results screen and its dashboard, which is how the two came to disagree about
 * what `undefined` should say. The tone that draws the mark comes from
 * `answerTone` in `@vk/core`; this is its counterpart for the words, kept here
 * rather than there because `@vk/core` holds no strings.
 */
export function answerLabelOf(answer: AnswerValue | undefined): string {
  if (answer === true) return messages.results.answerYes;
  if (answer === false) return messages.results.answerNo;
  if (answer === null) return messages.results.answerNeutral;
  return messages.results.answerNone;
}
