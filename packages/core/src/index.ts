/**
 * Domain core — pure TypeScript, no React, no framework.
 *
 * Everything the product actually *knows* lives here: the data model, the
 * translation from whatever the backend currently serves, the match
 * calculation, and the URL grammar. Keeping it framework-free is what makes the
 * app shell replaceable.
 */

export {
  ARCHIVE_ASSET_BASE,
  adaptArchiveCalculator,
  adaptArchiveIndex,
} from './adapters/archive';
export {
  type AnswerMap,
  type AnswerSegmentState,
  clearAnswer,
  countAnswered,
  countSkipped,
  firstUnansweredIndex,
  getAnswer,
  isComplete,
  setAnswer,
  skipQuestion,
  toggleImportant,
  toSegments,
  toUserAnswers,
} from './answers/answers';
export type {
  AnswerValue,
  Calculator,
  CalculatorIndex,
  Candidate,
  CandidateAnswer,
  District,
  Election,
  PartyRef,
  Question,
  UserAnswer,
} from './domain/types';
export { getFixtureIndex, getPardubiceCalculator, PARDUBICE_TOPICS } from './fixtures/index';
export {
  answerToNumber,
  type CandidateMatch,
  calculateBaseScore,
  calculateMatches,
  calculateMatchScorePercentage,
  candidateAnswersFor,
  processSingleAnswer,
  type QuestionScore,
} from './matching/calculate-matches';
export {
  type Agreement,
  buildComparison,
  buildResults,
  type CandidateResult,
  type ComparisonEntry,
} from './matching/results';
export {
  buildRoute,
  type CalculatorRoute,
  CS_SLUGS,
  type ElectionRoute,
  type FlowStep,
  type ParsedRoute,
  parseRoute,
  questionPath,
  type RouteSlugs,
} from './routing/routes';
