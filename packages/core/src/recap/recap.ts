import type { AnswerMap } from '../answers/answers';
import { countAnswered } from '../answers/answers';
import type { AnswerValue, Question } from '../domain/types';

/**
 * What the recap screen derives from the answers.
 *
 * Same split as `toSegments`: the shapes are presentational, but *which*
 * questions a filter leaves and *what* each chip counts is domain logic, and it
 * is the part with all the branching. Keeping it here means it can be tested
 * without rendering the screen — the screen itself only lays the result out.
 */

/** The two filters that are about progress rather than subject matter. */
export const RECAP_FILTER_ALL = 'all';
export const RECAP_FILTER_UNANSWERED = 'unanswered';
export const RECAP_FILTER_IMPORTANT = 'important';

/** Topic filters are namespaced so a topic literally named "all" can't collide. */
export const RECAP_TOPIC_PREFIX = 'topic:';

/** One of the fixed ids above, or `topic:<tag>`. */
export type RecapFilterId = string;

export function topicFilterId(topic: string): RecapFilterId {
  return `${RECAP_TOPIC_PREFIX}${topic}`;
}

/** How a row's answer mark reads. Mirrors @vk/ui's `RecapTone`. */
export type RecapAnswerTone = 'agree' | 'disagree' | 'none';

/** A filter chip, before its label is translated. Mirrors @vk/ui's `FilterOption`. */
export type RecapFilterOption = {
  id: RecapFilterId;
  label: string;
  count: number;
  separatorBefore?: boolean;
};

/** A question that survived the filter, carrying its position in the full list. */
export type RecapEntry = {
  question: Question;
  /** Index into the *unfiltered* questions — what the dialog opens by. */
  index: number;
};

/**
 * A question's topic — the first tag, or none.
 *
 * Only the first tag is ever shown or filtered on, so the "which one counts"
 * decision lives in one place rather than at each `tags[0]`.
 */
export function topicOf(question: Question): string | undefined {
  return question.tags[0];
}

export function toRecapAnswerTone(answer: AnswerValue | undefined): RecapAnswerTone {
  if (answer === true) return 'agree';
  if (answer === false) return 'disagree';
  return 'none';
}

export function matchesRecapFilter(
  question: Question,
  answers: AnswerMap,
  filter: RecapFilterId,
): boolean {
  const answer = answers[question.id];

  if (filter === RECAP_FILTER_ALL) return true;
  if (filter === RECAP_FILTER_UNANSWERED) return answer?.answer === undefined;
  if (filter === RECAP_FILTER_IMPORTANT) return answer?.isImportant === true;

  return topicOf(question) === filter.slice(RECAP_TOPIC_PREFIX.length);
}

export function filterRecapQuestions(
  questions: Question[],
  answers: AnswerMap,
  filter: RecapFilterId,
): RecapEntry[] {
  return questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => matchesRecapFilter(question, answers, filter));
}

/**
 * Topics with their question counts, in the order the questions introduce them.
 *
 * A Map, not a Set: the chips need counts, and building them in encounter order
 * keeps the filter row in the same sequence as the questions rather than in an
 * alphabetical one nobody asked for.
 */
export function countRecapTopics(questions: Question[]): [string, number][] {
  const counts = new Map<string, number>();

  for (const question of questions) {
    const topic = topicOf(question);
    if (topic) counts.set(topic, (counts.get(topic) ?? 0) + 1);
  }

  return [...counts];
}

/** The three tallies the recap header and its chips are built from. */
export type RecapTotals = {
  total: number;
  answered: number;
  /**
   * Questions with no recorded position. Skipped and never-reached are the same
   * bucket here — both are "no position taken".
   */
  remaining: number;
  important: number;
};

export function countRecapTotals(questions: Question[], answers: AnswerMap): RecapTotals {
  const answered = countAnswered(questions, answers);

  return {
    total: questions.length,
    answered,
    remaining: questions.length - answered,
    important: questions.filter((q) => answers[q.id]?.isImportant === true).length,
  };
}

/**
 * The filter row.
 *
 * "Nezodpovězené" and "Důležité" only appear when they would leave anything —
 * a chip that filters to an empty list is an offer to reach a dead end. Topics
 * always follow, separated by a hairline because they answer a different
 * question from the two progress filters.
 */
export function buildRecapFilters(
  questions: Question[],
  answers: AnswerMap,
  labels: { all: string; unanswered: string; important: string },
): RecapFilterOption[] {
  const { total, remaining, important } = countRecapTotals(questions, answers);

  return [
    { id: RECAP_FILTER_ALL, label: labels.all, count: total },
    ...(remaining > 0
      ? [{ id: RECAP_FILTER_UNANSWERED, label: labels.unanswered, count: remaining }]
      : []),
    ...(important > 0
      ? [{ id: RECAP_FILTER_IMPORTANT, label: labels.important, count: important }]
      : []),
    ...countRecapTopics(questions).map(([topic, count], index) => ({
      id: topicFilterId(topic),
      label: topic,
      count,
      separatorBefore: index === 0,
    })),
  ];
}
