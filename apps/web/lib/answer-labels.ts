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
 *
 * `messages.answer` is the single place an answer is named — the card's own
 * buttons, the drag hint, the keyboard shortcuts, the recap rows and the results
 * comparison all resolve to these four strings. There used to be two competing
 * sets ("Souhlasím"/"Nesouhlasím" in the flow, "Ano"/"Ne" in the results), which
 * is how the same answer came to have two names one screen apart.
 */
export function answerLabelOf(answer: AnswerValue | undefined): string {
  if (answer === true) return messages.answer.yes;
  if (answer === false) return messages.answer.no;
  if (answer === null) return messages.answer.neutral;
  return messages.answer.none;
}
