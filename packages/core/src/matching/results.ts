import type { AnswerMap } from '../answers/answers';
import { toUserAnswers } from '../answers/answers';
import type { AnswerValue, Calculator, Candidate, Question } from '../domain/types';
import { type CandidateMatch, calculateMatches, candidateAnswersFor } from './calculate-matches';

/**
 * The results screen's data, assembled once.
 *
 * This sits in core rather than in the app because it is where two rules with
 * real consequences live: who can be ranked at all, and which of the user's
 * answers a comparison is allowed to show. Both must agree with the percentage
 * the same module computed.
 */

export type CandidateResult = {
  candidate: Candidate;
  match: CandidateMatch;
  /**
   * 1-based position among candidates that could be compared. `undefined` for a
   * candidate who never answered — they appear in the list but not in the
   * ranking, because there is nothing to rank them on.
   */
  rank?: number;
};

export function buildResults(calculator: Calculator, answers: AnswerMap): CandidateResult[] {
  const userAnswers = toUserAnswers(calculator.questions, answers);
  const matches = calculateMatches(calculator, userAnswers);
  const byId = new Map(calculator.candidates.map((c) => [c.id, c]));

  let rank = 0;

  return matches.flatMap((match): CandidateResult[] => {
    const candidate = byId.get(match.candidateId);
    if (!candidate) return [];

    const comparable = match.matchPercentage !== undefined;
    if (comparable) rank += 1;

    return [{ candidate, match, ...(comparable ? { rank } : {}) }];
  });
}

/** How the user's answer and the candidate's relate on one question. */
export type Agreement = 'match' | 'mismatch' | 'none';

export type ComparisonEntry = {
  question: Question;
  /** `undefined` when the user skipped or never reached it. */
  userAnswer?: AnswerValue;
  userImportant: boolean;
  /** `undefined` when this candidate left the question unanswered. */
  candidateAnswer?: AnswerValue;
  candidateComment?: string;
  agreement: Agreement;
};

function agreementOf(user: AnswerValue | undefined, candidate: AnswerValue | undefined): Agreement {
  // A neutral on either side is a real answer that simply carries no direction,
  // so it is neither a match nor a mismatch.
  if (user === undefined || candidate === undefined) return 'none';
  if (user === null || candidate === null) return 'none';
  return user === candidate ? 'match' : 'mismatch';
}

/**
 * The user against one candidate, question by question.
 *
 * Only questions the user actually answered appear: a question they skipped
 * says nothing about either side, and listing it would pad the comparison with
 * rows that carry no information.
 */
export function buildComparison(
  calculator: Calculator,
  answers: AnswerMap,
  candidateId: string,
): ComparisonEntry[] {
  const candidateAnswers = new Map(
    candidateAnswersFor(calculator, candidateId).map((a) => [a.questionId, a]),
  );

  return calculator.questions.flatMap((question): ComparisonEntry[] => {
    const user = answers[question.id];
    if (!user || user.answer === undefined) return [];

    const theirs = candidateAnswers.get(question.id);

    return [
      {
        question,
        userAnswer: user.answer,
        userImportant: user.isImportant === true,
        candidateAnswer: theirs?.answer,
        ...(theirs?.comment ? { candidateComment: theirs.comment } : {}),
        agreement: agreementOf(user.answer, theirs?.answer),
      },
    ];
  });
}
