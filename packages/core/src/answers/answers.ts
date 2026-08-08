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
      skipped: false,
    },
  };
}

/**
 * Explicitly skip — distinct from never having reached the question.
 *
 * "Important" only makes sense attached to a real position, so skipping drops
 * any flag armed before the skip rather than carrying it forward unanswered.
 */
export function skipQuestion(answers: AnswerMap, questionId: string): AnswerMap {
  return {
    ...answers,
    [questionId]: {
      questionId,
      answer: undefined,
      isImportant: false,
      skipped: true,
    },
  };
}

/**
 * Toggle "pro mě důležité".
 *
 * Can be armed before answering: the prototype lets you press the star first and
 * carries the flag into whichever answer you then give. Arming it must not read
 * as a skip, so the existing `skipped`/`answer` state is preserved untouched.
 */
export function toggleImportant(answers: AnswerMap, questionId: string): AnswerMap {
  const existing = answers[questionId];

  return {
    ...answers,
    [questionId]: {
      questionId,
      answer: existing?.answer,
      isImportant: !existing?.isImportant,
      skipped: existing?.skipped ?? false,
    },
  };
}

export function clearAnswer(answers: AnswerMap, questionId: string): AnswerMap {
  const { [questionId]: _removed, ...rest } = answers;
  return rest;
}

/**
 * How a recorded position reads as a mark. Mirrors @vk/ui's `AnswerMarkTone`.
 *
 * `neutral` is an explicit "Nevím" — a real answer that takes no side — and is
 * deliberately distinct from `none`, the absence of any answer at all. Nothing
 * in the question flow produces `null` today (the card offers agree and
 * disagree only), but candidates' imported answers do, and the domain type
 * allows it, so the distinction is carried rather than collapsed.
 */
export type AnswerTone = 'agree' | 'disagree' | 'neutral' | 'none';

/**
 * The one mapping from a stored answer to the tone that draws it.
 *
 * Had been written out three separate times — twice in the results screen's own
 * components and once here as a recap-only helper that folded `null` into
 * `none`, so an explicit "Nevím" was indistinguishable from an unanswered
 * question on the recap while the recap's *filter* counted it as answered.
 * One definition removes that disagreement and the drift that produced it.
 */
export function answerTone(answer: AnswerValue | undefined): AnswerTone {
  if (answer === true) return 'agree';
  if (answer === false) return 'disagree';
  if (answer === null) return 'neutral';
  return 'none';
}

/** Answers in question order — the shape `calculateMatches` expects. */
export function toUserAnswers(questions: Question[], answers: AnswerMap): UserAnswer[] {
  return questions.map((q) => answers[q.id]).filter((a): a is UserAnswer => a !== undefined);
}

/**
 * How many of *these* questions have a real position recorded (skips do not count).
 *
 * Scoped to the question list rather than counting the stored map, because the
 * two can disagree: answers persist in the browser across a calculator's
 * question set changing, and counting the map produced "Zodpovězeno 43 z 42" —
 * a total larger than the thing it was a total of.
 */
export function countAnswered(questions: Question[], answers: AnswerMap): number {
  return questions.filter((q) => answers[q.id]?.answer !== undefined).length;
}

/** How many questions were explicitly skipped. */
export function countSkipped(answers: AnswerMap): number {
  return Object.values(answers).filter((a) => a.skipped === true && a.answer === undefined).length;
}

/** A question is "visited" once it has a real position or an explicit skip. */
function isVisited(answer: UserAnswer | undefined): boolean {
  return answer !== undefined && (answer.answer !== undefined || answer.skipped === true);
}

export function isComplete(questions: Question[], answers: AnswerMap): boolean {
  return questions.every((q) => isVisited(answers[q.id]));
}

/** Index of the first question with nothing recorded, or -1 when finished. */
export function firstUnansweredIndex(questions: Question[], answers: AnswerMap): number {
  return questions.findIndex((q) => !isVisited(answers[q.id]));
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
    if (answer.skipped) return { state: 'skipped', important };
    if (answer.answer === undefined) return { state: 'unanswered', important };
    if (answer.answer === true) return { state: 'agree', important };
    if (answer.answer === false) return { state: 'disagree', important };

    // An explicit neutral reads as skipped in the bar; it still scores.
    return { state: 'skipped', important };
  });
}
