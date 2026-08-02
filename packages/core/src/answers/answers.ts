import type { AnswerValue, Question, UserAnswer } from '../domain/types';

/**
 * Answer state as pure data plus pure transitions.
 *
 * The React store (Zustand, in the app) is a thin wrapper over these, so the
 * interesting behaviour — re-tapping an answer to clear it, marking a question
 * important before answering it — is testable without rendering anything.
 */

export type AnswerMap = Record<string, UserAnswer>;

/** How a question reads in the progress bar. Mirrors @vk/ui's `SegmentState`. */
export type AnswerSegmentState = 'unanswered' | 'agree' | 'disagree' | 'skipped';

export function getAnswer(answers: AnswerMap, questionId: string): UserAnswer | undefined {
  return answers[questionId];
}

/**
 * Record a position.
 *
 * Choosing the answer you already gave clears it — that is how the prototype
 * behaves, and it is the only way to undo an answer without leaving the card.
 */
export function setAnswer(answers: AnswerMap, questionId: string, answer: AnswerValue): AnswerMap {
  const existing = answers[questionId];

  if (existing && existing.answer === answer) {
    return clearAnswer(answers, questionId);
  }

  return {
    ...answers,
    [questionId]: {
      questionId,
      answer,
      isImportant: existing?.isImportant ?? false,
    },
  };
}

/** Explicitly skip — distinct from never having reached the question. */
export function skipQuestion(answers: AnswerMap, questionId: string): AnswerMap {
  return {
    ...answers,
    [questionId]: {
      questionId,
      answer: undefined,
      isImportant: answers[questionId]?.isImportant ?? false,
    },
  };
}

/**
 * Toggle "pro mě důležité".
 *
 * Can be armed before answering: the prototype lets you press the star first and
 * carries the flag into whichever answer you then give.
 */
export function toggleImportant(answers: AnswerMap, questionId: string): AnswerMap {
  const existing = answers[questionId];

  return {
    ...answers,
    [questionId]: {
      questionId,
      answer: existing?.answer,
      isImportant: !existing?.isImportant,
    },
  };
}

export function clearAnswer(answers: AnswerMap, questionId: string): AnswerMap {
  const { [questionId]: _removed, ...rest } = answers;
  return rest;
}

/** Answers in question order — the shape `calculateMatches` expects. */
export function toUserAnswers(questions: Question[], answers: AnswerMap): UserAnswer[] {
  return questions.map((q) => answers[q.id]).filter((a): a is UserAnswer => a !== undefined);
}

/** How many questions have a real position recorded (skips do not count). */
export function countAnswered(answers: AnswerMap): number {
  return Object.values(answers).filter((a) => a.answer !== undefined).length;
}

export function isComplete(questions: Question[], answers: AnswerMap): boolean {
  return questions.every((q) => answers[q.id] !== undefined);
}

/** Index of the first question with nothing recorded, or -1 when finished. */
export function firstUnansweredIndex(questions: Question[], answers: AnswerMap): number {
  return questions.findIndex((q) => answers[q.id] === undefined);
}

/** Derive the progress bar. Presentation shape, but the mapping is domain logic. */
export function toSegments(
  questions: Question[],
  answers: AnswerMap,
): { state: AnswerSegmentState; important: boolean }[] {
  return questions.map((q) => {
    const answer = answers[q.id];
    const important = answer?.isImportant === true;

    if (!answer) return { state: 'unanswered', important };
    if (answer.answer === undefined) return { state: 'skipped', important };
    if (answer.answer === true) return { state: 'agree', important };
    if (answer.answer === false) return { state: 'disagree', important };

    // An explicit neutral reads as skipped in the bar; it still scores.
    return { state: 'skipped', important };
  });
}
