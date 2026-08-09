/**
 * The canonical domain model.
 *
 * This deliberately follows the *newer* shape the platform is moving to
 * (statement/detail, tri-state answers, `isImportant`) rather than the older
 * archive JSON we currently read. Archive data is translated at the edge by
 * `adapters/archive.ts`, so nothing above the adapter knows the legacy format
 * exists and swapping in the real backend later touches one file.
 */

import type { DistrictKind } from '@vk/i18n';

/**
 * What a voter is choosing between when they pick a district — a město, a
 * senate obvod, a calculator variant, a Hungarian választókerület.
 *
 * Defined by the message catalog (`@vk/i18n`) rather than here: the kind
 * selects the picker's entire vocabulary and nothing else in the domain reads
 * it, so the catalog is the registry and a new country's kind costs one
 * catalog section plus one config value. Re-exported here so consumers keep
 * importing the domain vocabulary from one place; the import is type-only, so
 * no message data reaches a bundle through `@vk/core`.
 */
export type { DistrictKind };

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
  /**
   * A hex accent colour, resolved in priority order: authored in the source
   * data, else derived server-side from the logo (`apps/web/lib/logo-color.ts`),
   * else left `undefined` — in which case `partyColor` in `@vk/ui` falls back
   * to its name-seeded palette.
   */
  color?: string;
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
  /**
   * Semver of the published data, when the source has one.
   *
   * Only the platform format carries it; the archive does not, and nothing in
   * the app renders it. It exists so a stored session records which version of
   * the questions it was answered against — a session is otherwise silently
   * reinterpreted when a calculator is republished.
   */
  version?: string;
  electionId: string;
  electionName: string;
  /**
   * Whatever identifies this calculator *within* its election: a municipality
   * code, a senate obvod number, or — where the election is nationwide and its
   * calculators are variants of one another — the variant key ("expresni").
   * See `District.slug` for the URL-facing identifier, which may differ.
   */
  districtCode: string;
  /** Display name, e.g. "Pardubice". */
  name: string;
  description?: string;
  questions: Question[];
  candidates: Candidate[];
  /** Keyed by candidate id. A candidate that never answered has no entry. */
  candidateAnswers: Record<string, CandidateAnswer[]>;
  /**
   * Where this calculator's own images live — every `avatarUrl`/`logoUrl` on
   * it starts with this string. Only the platform format sets it; the archive
   * resolves its own images against a fixed, unrelated host instead (see
   * `ARCHIVE_ASSET_BASE`). It exists so a caller can recognise "this image is
   * one of this calculator's own" without hard-coding a CDN host — the share
   * card's export proxy rewrite is the one consumer today.
   */
  assetBase?: string;
};

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

/** A selectable district/municipality/variant within an election. */
export type District = {
  electionId: string;
  code: string;
  name: string;
  /**
   * The URL segment, e.g. "pardubice" or "expresni".
   *
   * Explicit rather than derived from `name` at the app layer: `slugifyDistrict`
   * only works on Latin names (it strips what NFD decomposition can strip, so a
   * Cyrillic name slugifies to the empty string), and the platform source
   * already has a real key per calculator. Sources that have one supply it; the
   * archive, which does not, derives it in its adapter.
   */
  slug: string;
  description?: string;
  /** Senate obvody are identified by number; municipalities and variants are not. */
  showCode: boolean;
};

export type CalculatorIndex = {
  elections: Election[];
  districts: District[];
};
