import { type Question, topicOf } from '@vk/core';
import type { QuestionCardContent } from '@vk/ui';

/**
 * Domain question -> the shape a `QuestionCard` draws.
 *
 * The seam between `@vk/core` and `@vk/ui`, which know nothing of each other by
 * design. It lives in the app because the app is the only layer allowed to see
 * both — and in one file because the deck and the recap's dialog must show the
 * same card, down to which tag counts as the topic.
 */
export function toCardContent(question: Question): QuestionCardContent {
  return {
    id: question.id,
    statement: question.statement,
    title: question.title,
    detail: question.detail,
    topic: topicOf(question),
  };
}
