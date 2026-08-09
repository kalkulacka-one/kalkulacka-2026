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
  type AdaptPlatformCalculatorInput,
  adaptPlatformCalculator,
  adaptPlatformSummary,
  type PlatformCalculatorSummary,
} from './adapters/platform';
export {
  type AnswerMap,
  type AnswerSegmentState,
  type AnswerTone,
  answerTone,
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
  DistrictKind,
  Election,
  PartyRef,
  Question,
  UserAnswer,
} from './domain/types';
export { getFixtureIndex, getPardubiceCalculator, PARDUBICE_TOPICS } from './fixtures/index';
export {
  type AnswerDistribution,
  buildAnswerDistribution,
  buildQuestionConsensus,
  buildTopicMatches,
  MIN_TOPIC_ANSWERS,
  type QuestionConsensus,
  selectAgainstTheGrain,
  selectImportant,
  type TopicMatch,
} from './insights/insights';
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
  buildRecapFilters,
  countRecapTopics,
  countRecapTotals,
  filterRecapQuestions,
  matchesRecapFilter,
  RECAP_FILTER_ALL,
  RECAP_FILTER_IMPORTANT,
  RECAP_FILTER_UNANSWERED,
  RECAP_TOPIC_PREFIX,
  type RecapEntry,
  type RecapFilterId,
  type RecapFilterOption,
  type RecapTotals,
  topicFilterId,
  topicOf,
} from './recap/recap';
export {
  buildRoute,
  type CalculatorRoute,
  type ElectionRoute,
  type FlowStep,
  type ParsedRoute,
  parseRoute,
  questionPath,
  type RouteSlugs,
  slugifyDistrict,
} from './routing/routes';
