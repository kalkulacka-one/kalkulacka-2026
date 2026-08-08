/**
 * The canonical domain model.
 *
 * This deliberately follows the *newer* shape the platform is moving to
 * (statement/detail, tri-state answers, `isImportant`) rather than the older
 * archive JSON we currently read. Archive data is translated at the edge by
 * `adapters/archive.ts`, so nothing above the adapter knows the legacy format
 * exists and swapping in the real backend later touches one file.
 */

/**
 * A position on a statement.
 *
 * `true` agree · `false` disagree · `null` explicitly neutral / "nevím"
 * · `undefined` not answered at all (skipped)
 *
 * The distinction between `null` and `undefined` matters for scoring: a neutral
 * answer participates and contributes nothing, a skipped one is excluded.
 */
export type AnswerValue = boolean | null;

export type Question = {
  id: string;
  /** Short label — the outlined chip on the card, e.g. "Omezení vánoční výzdoby". */
  title: string;
  /** The statement the user agrees or disagrees with — the large text. */
  statement: string;
  /** Optional explainer shown under the statement. */
  detail?: string;
  /** Topic tags — the filled chip. May be empty. */
  tags: string[];
};

export type PartyRef = {
  id: string;
  name: string;
  shortName: string;
  abbreviation?: string;
  logoUrl?: string;
};

export type Candidate = {
  id: string;
  name: string;
  /** Truncated name for tight layouts. */
  shortName: string;
  type: 'party' | 'person';
  description?: string;
  motto?: string;
  avatarUrl?: string;
  /** Populated for coalitions — the constituent parties. */
  members: PartyRef[];
  contacts: {
    web: { url: string; label: string }[];
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
};

export type CandidateAnswer = {
  questionId: string;
  answer: AnswerValue;
  /** The candidate's own justification, shown in the results comparison. */
  comment?: string;
};

/** One user's position on one question. */
export type UserAnswer = {
  questionId: string;
  /**
   * `undefined` means no position recorded — either because the question was
   * explicitly skipped (`skipped: true`) or because only the importance star
   * was armed before an answer was ever given.
   */
  answer?: AnswerValue;
  isImportant?: boolean;
  /** True only for an explicit "Přeskočit" — distinct from importance armed early. */
  skipped?: boolean;
};

export type Calculator = {
  id: string;
  electionId: string;
  electionName: string;
  /** Municipality code or senate district number. */
  districtCode: string;
  /** Display name, e.g. "Pardubice". */
  name: string;
  description?: string;
  questions: Question[];
  candidates: Candidate[];
  /** Keyed by candidate id. A candidate that never answered has no entry. */
  candidateAnswers: Record<string, CandidateAnswer[]>;
};

/**
 * What a voter is choosing between when they pick a district.
 *
 * The picker's whole vocabulary hangs off this — "město" and "obvod" decline
 * differently in every sentence on the screen, so it cannot be papered over
 * with one neutral word. The archive format does not state it, so the adapter
 * infers it from whether the election's districts are numbered.
 */
export type DistrictKind = 'municipality' | 'senate';

/** An election, as listed on the picker. */
export type Election = {
  id: string;
  key: string;
  name: string;
  description?: string;
  districtKind: DistrictKind;
  from?: string;
  to?: string;
};

/** A selectable district/municipality within an election. */
export type District = {
  electionId: string;
  code: string;
  name: string;
  description?: string;
  /** Senate districts are identified by number, municipalities are not. */
  showCode: boolean;
};

export type CalculatorIndex = {
  elections: Election[];
  districts: District[];
};
