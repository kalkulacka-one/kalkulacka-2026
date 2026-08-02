import type { AnswerValue, Calculator, CandidateAnswer, UserAnswer } from '../domain/types';

/**
 * Match calculation, ported from the existing platform's `result-calculation`
 * module. The semantics are deliberately unchanged — results must stay
 * comparable with previous elections.
 *
 *   agree (true) -> +1 · disagree (false) -> -1 · neutral (null) -> 0
 *   skipped (undefined) -> the question is excluded entirely
 *
 * A question marked "pro mě důležité" doubles both the score and the weight, so
 * it counts twice without being able to push the result out of range.
 */

export type QuestionScore = {
  questionId: string;
  score: number;
  weight: number;
};

export type CandidateMatch = {
  candidateId: string;
  /** `undefined` when nothing could be compared — a candidate who never answered. */
  matchPercentage: number | undefined;
  /** How many questions actually contributed. */
  comparedCount: number;
  score: number;
  weight: number;
};

export function answerToNumber(answer: AnswerValue | undefined): number | undefined {
  if (answer === undefined) return undefined;
  if (answer === null) return 0;
  return answer ? 1 : -1;
}

/** +1 when both sides lean the same way, -1 when opposed, 0 if either is neutral. */
export function calculateBaseScore(user: number, candidate: number): number {
  return Math.sign(user * candidate);
}

export function processSingleAnswer(
  userAnswer: UserAnswer,
  candidateAnswer: CandidateAnswer | undefined,
): QuestionScore {
  const user = answerToNumber(userAnswer.answer);
  const candidate = candidateAnswer ? answerToNumber(candidateAnswer.answer) : undefined;

  // Either side abstaining removes the question from the comparison entirely,
  // rather than counting as a mismatch.
  if (user === undefined || candidate === undefined) {
    return { questionId: userAnswer.questionId, score: 0, weight: 0 };
  }

  const base = calculateBaseScore(user, candidate);
  const important = userAnswer.isImportant === true;

  return {
    questionId: userAnswer.questionId,
    score: important ? base * 2 : base,
    weight: important ? 2 : 1,
  };
}

/**
 * Map a total score onto 0–100.
 *
 * score/weight lands in [-1, 1]; this rescales it so "opposed on everything" is
 * 0 %, "no net agreement" is 50 % and "agreed on everything" is 100 %.
 */
export function calculateMatchScorePercentage(total: {
  score: number;
  weight: number;
}): number | undefined {
  if (total.weight === 0) return undefined;
  return ((1 + total.score / total.weight) / 2) * 100;
}

function indexByQuestion(answers: CandidateAnswer[]): Map<string, CandidateAnswer> {
  return new Map(answers.map((a) => [a.questionId, a]));
}

/**
 * Score every candidate against the user's answers.
 *
 * Coalitions with no answers of their own fall back to aggregating their
 * members' answers, matching the existing platform's behaviour.
 *
 * Sorted best-first. Candidates who could not be compared at all sort last and
 * keep `matchPercentage: undefined` so the UI can say "neodpověděli" instead of
 * showing a misleading 0 %.
 */
export function calculateMatches(
  calculator: Calculator,
  userAnswers: UserAnswer[],
): CandidateMatch[] {
  const answered = userAnswers.filter((a) => a.answer !== undefined);

  const matches = calculator.candidates.map((candidate): CandidateMatch => {
    const own = calculator.candidateAnswers[candidate.id];
    const answers =
      own && own.length > 0
        ? own
        : candidate.members.flatMap((m) => calculator.candidateAnswers[m.id] ?? []);

    const byQuestion = indexByQuestion(answers);

    let score = 0;
    let weight = 0;
    let comparedCount = 0;

    for (const userAnswer of answered) {
      const result = processSingleAnswer(userAnswer, byQuestion.get(userAnswer.questionId));
      score += result.score;
      weight += result.weight;
      if (result.weight > 0) comparedCount += 1;
    }

    return {
      candidateId: candidate.id,
      matchPercentage: calculateMatchScorePercentage({ score, weight }),
      comparedCount,
      score,
      weight,
    };
  });

  return matches.sort((a, b) => {
    const aPct = a.matchPercentage;
    const bPct = b.matchPercentage;

    if (aPct === undefined && bPct === undefined) return a.candidateId.localeCompare(b.candidateId);
    if (aPct === undefined) return 1;
    if (bPct === undefined) return -1;
    if (aPct !== bPct) return bPct - aPct;

    // Deterministic tie-break so repeated runs and SSR/CSR agree.
    return a.candidateId.localeCompare(b.candidateId);
  });
}
