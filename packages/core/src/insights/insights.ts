import type { AnswerMap } from '../answers/answers';
import type { AnswerValue, Calculator, Candidate, Question, UserAnswer } from '../domain/types';
import {
  answerToNumber,
  calculateBaseScore,
  calculateMatchScorePercentage,
  candidateAnswersFor,
  processSingleAnswer,
} from '../matching/calculate-matches';
import { topicOf } from '../recap/recap';

/**
 * What the results dashboard reads off the answers.
 *
 * Same reasoning as `recap.ts`: the shapes here are presentational, but every
 * judgement in them — which topics carry enough answers to be worth a number,
 * what counts as agreeing with a party, which questions put you in a minority —
 * is domain logic with consequences, and it must agree with the percentage
 * `calculateMatches` produced. So it is computed from the same primitives, in
 * one place, and tested without rendering a screen.
 */

/* --- How you answered ----------------------------------------------------- */

/**
 * The donut on the dashboard.
 *
 * `unanswered` merges explicitly-skipped with never-reached, the same call the
 * recap makes: both are "no position taken", and the results screen doesn't act
 * on the difference any more than the recap did.
 */
export type AnswerDistribution = {
  agree: number;
  disagree: number;
  /** Explicit "nevím" — a real answer that carries no direction. */
  neutral: number;
  unanswered: number;
  total: number;
};

export function buildAnswerDistribution(
  questions: Question[],
  answers: AnswerMap,
): AnswerDistribution {
  const distribution: AnswerDistribution = {
    agree: 0,
    disagree: 0,
    neutral: 0,
    unanswered: 0,
    total: questions.length,
  };

  for (const question of questions) {
    const answer = answers[question.id]?.answer;

    if (answer === true) distribution.agree += 1;
    else if (answer === false) distribution.disagree += 1;
    else if (answer === null) distribution.neutral += 1;
    else distribution.unanswered += 1;
  }

  return distribution;
}

/* --- Who is closest to you, topic by topic -------------------------------- */

export type TopicMatch = {
  topic: string;
  /** Questions carrying this topic, answered or not. */
  questionCount: number;
  /** …that you actually took a position on. This is what the number rests on. */
  answeredCount: number;
  /** The closest candidate over just these questions. */
  best: { candidate: Candidate; matchPercentage: number };
};

/**
 * Topics you gave fewer than this many answers on are left out entirely.
 *
 * Four of Pardubice's eleven topics carry one or two questions. A single
 * answered question yields 0 % or 100 % and would sit in the list looking
 * exactly like a number derived from ten — so the cheap fix (showing the count
 * next to it) isn't enough. The row is only offered once it means something.
 */
export const MIN_TOPIC_ANSWERS = 3;

/**
 * Per-topic ranking, strongest topic first.
 *
 * "Strongest" is how many answers back it, not how high the percentage is:
 * ordering by score would put a 3-question topic above a 10-question one for
 * being easier to max out, which is the opposite of how much it should be
 * trusted.
 */
export function buildTopicMatches(
  calculator: Calculator,
  answers: AnswerMap,
  minAnswers: number = MIN_TOPIC_ANSWERS,
): TopicMatch[] {
  const byTopic = new Map<string, Question[]>();

  for (const question of calculator.questions) {
    const topic = topicOf(question);
    if (!topic) continue;

    const bucket = byTopic.get(topic);
    if (bucket) bucket.push(question);
    else byTopic.set(topic, [question]);
  }

  // Indexed once and reused across every topic — `candidateAnswersFor` walks a
  // coalition's members, and doing that per topic per candidate is the same
  // work repeated eleven times.
  const candidateAnswers = calculator.candidates.map((candidate) => ({
    candidate,
    byQuestion: new Map(
      candidateAnswersFor(calculator, candidate.id).map((a) => [a.questionId, a]),
    ),
  }));

  const matches: TopicMatch[] = [];

  for (const [topic, questions] of byTopic) {
    const answered = questions
      .map((question) => answers[question.id])
      .filter(
        (answer): answer is UserAnswer => answer !== undefined && answer.answer !== undefined,
      );

    if (answered.length < minAnswers) continue;

    let best: TopicMatch['best'] | undefined;

    for (const { candidate, byQuestion } of candidateAnswers) {
      let score = 0;
      let weight = 0;

      for (const userAnswer of answered) {
        const result = processSingleAnswer(userAnswer, byQuestion.get(userAnswer.questionId));
        score += result.score;
        weight += result.weight;
      }

      const matchPercentage = calculateMatchScorePercentage({ score, weight });
      if (matchPercentage === undefined) continue;

      // Ties break on candidate id so repeated runs, and server and client,
      // agree on which of two equally-close parties is named.
      const better =
        best === undefined ||
        matchPercentage > best.matchPercentage ||
        (matchPercentage === best.matchPercentage &&
          candidate.id.localeCompare(best.candidate.id) < 0);

      if (better) best = { candidate, matchPercentage };
    }

    if (best) {
      matches.push({
        topic,
        questionCount: questions.length,
        answeredCount: answered.length,
        best,
      });
    }
  }

  return matches.sort(
    (a, b) => b.answeredCount - a.answeredCount || a.topic.localeCompare(b.topic),
  );
}

/* --- Where each question left you ----------------------------------------- */

export type QuestionConsensus = {
  question: Question;
  /** Never `undefined` — only questions you answered appear. */
  userAnswer: AnswerValue;
  important: boolean;
  /** Candidates who took the same side. */
  agreeing: Candidate[];
  /** Candidates who took the opposite side. */
  opposing: Candidate[];
  /**
   * Candidates who recorded any position at all, including neutrals that fall
   * into neither list. The denominator for "how alone was I here".
   */
  respondedCount: number;
};

/**
 * Every question you answered, with the parties sorted onto your side and against it.
 *
 * One pass over the data feeding two dashboard cards, because both ask the same
 * underlying question — who agreed with you here — and computing it twice is how
 * two cards on the same screen end up disagreeing.
 */
export function buildQuestionConsensus(
  calculator: Calculator,
  answers: AnswerMap,
): QuestionConsensus[] {
  const candidateAnswers = calculator.candidates.map((candidate) => ({
    candidate,
    byQuestion: new Map(
      candidateAnswersFor(calculator, candidate.id).map((a) => [a.questionId, a]),
    ),
  }));

  return calculator.questions.flatMap((question): QuestionConsensus[] => {
    const recorded = answers[question.id];
    if (!recorded || recorded.answer === undefined) return [];

    const user = answerToNumber(recorded.answer);
    if (user === undefined) return [];

    const agreeing: Candidate[] = [];
    const opposing: Candidate[] = [];
    let respondedCount = 0;

    for (const { candidate, byQuestion } of candidateAnswers) {
      const theirs = byQuestion.get(question.id);
      if (!theirs) continue;

      const value = answerToNumber(theirs.answer);
      if (value === undefined) continue;

      respondedCount += 1;

      // A neutral on either side lands in neither list — it is a real answer
      // that simply takes no side, the same rule the comparison uses.
      const side = calculateBaseScore(user, value);
      if (side > 0) agreeing.push(candidate);
      else if (side < 0) opposing.push(candidate);
    }

    return [
      {
        question,
        userAnswer: recorded.answer,
        important: recorded.isImportant === true,
        agreeing,
        opposing,
        respondedCount,
      },
    ];
  });
}

/** The questions you starred, in question order. */
export function selectImportant(consensus: QuestionConsensus[]): QuestionConsensus[] {
  return consensus.filter((entry) => entry.important);
}

/**
 * The questions where you stood with the fewest parties.
 *
 * Ranked by the *share* that agreed rather than the count, so a question only
 * three parties answered is judged on those three. Questions nobody answered
 * carry no information about how alone you were and are dropped.
 */
export function selectAgainstTheGrain(
  consensus: QuestionConsensus[],
  limit = 3,
): QuestionConsensus[] {
  return consensus
    .filter((entry) => entry.respondedCount > 0 && entry.agreeing.length < entry.opposing.length)
    .sort((a, b) => {
      const shareA = a.agreeing.length / a.respondedCount;
      const shareB = b.agreeing.length / b.respondedCount;

      // More respondents is a stronger signal at the same share, so it wins the
      // tie; question id last, so the list is stable run to run.
      return (
        shareA - shareB ||
        b.respondedCount - a.respondedCount ||
        a.question.id.localeCompare(b.question.id)
      );
    })
    .slice(0, limit);
}
