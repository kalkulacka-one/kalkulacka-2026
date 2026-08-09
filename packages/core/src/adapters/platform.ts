import type {
  AnswerValue,
  Calculator,
  Candidate,
  CandidateAnswer,
  PartyRef,
  Question,
} from '../domain/types';
import {
  type PlatformCalculator,
  type PlatformCandidate,
  type PlatformImage,
  type PlatformOrganization,
  type PlatformPerson,
  platformCalculatorSchema,
  platformCandidatesAnswersSchema,
  platformCandidatesSchema,
  platformOrganizationsSchema,
  platformPersonsSchema,
  platformQuestionsSchema,
} from './platform-schema';

/**
 * Platform image paths are relative to the calculator's own asset folder, not
 * a fixed host — unlike the archive, there is no single CDN root, so the base
 * comes in as a parameter rather than a module constant.
 */
function resolveAssetUrl(path: string | undefined, assetBase: string): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${assetBase}${assetBase.endsWith('/') ? '' : '/'}${path}`;
}

/** Smallest-to-largest preference for an avatar-sized crop; `original` always exists. */
const AVATAR_SIZE_PREFERENCE = ['sm', 'xs', 'md', 'lg', 'xl', '2xl', '3xl', 'original'] as const;

function pickImageVariant(image: PlatformImage): string {
  for (const size of AVATAR_SIZE_PREFERENCE) {
    const value = image.urls[size];
    if (value) return value;
  }
  return image.urls.original;
}

function findImage(
  images: PlatformImage[] | undefined,
  types: readonly PlatformImage['type'][],
): PlatformImage | undefined {
  if (!images) return undefined;
  for (const type of types) {
    const found = images.find((img) => img.type === type);
    if (found) return found;
  }
  return undefined;
}

type ResolvedIdentity = {
  name: string;
  shortName: string;
  abbreviation?: string;
  avatarUrl?: string;
};

function resolveFromOrganization(org: PlatformOrganization, assetBase: string): ResolvedIdentity {
  const image = findImage(org.images, ['logo', 'avatar']);
  return {
    name: org.name,
    shortName: org.shortName ?? org.abbreviation ?? org.name,
    abbreviation: org.abbreviation,
    avatarUrl: image ? resolveAssetUrl(pickImageVariant(image), assetBase) : undefined,
  };
}

type ReferenceMaps = {
  persons: Map<string, PlatformPerson>;
  organizations: Map<string, PlatformOrganization>;
};

/**
 * A candidate carries an explicit `displayName` when it is a coalition (e.g.
 * "SPOLU") — otherwise its identity is resolved from the first person or
 * organization it references, mirroring the platform's own view-model logic.
 */
function resolveCandidateIdentity(
  candidate: PlatformCandidate,
  maps: ReferenceMaps,
  assetBase: string,
): ResolvedIdentity {
  const ownImage = findImage(candidate.images, ['avatar', 'logo', 'portrait']);
  const firstRef = candidate.references[0];
  const referenced =
    firstRef?.type === 'person'
      ? maps.persons.get(firstRef.id)
      : firstRef?.type === 'organization'
        ? maps.organizations.get(firstRef.id)
        : undefined;

  const resolvedFromRef = referenced
    ? firstRef?.type === 'person'
      ? resolveFromPerson(referenced as PlatformPerson, assetBase)
      : resolveFromOrganization(referenced as PlatformOrganization, assetBase)
    : undefined;

  const name = candidate.displayName ?? resolvedFromRef?.name ?? candidate.id;
  return {
    name,
    shortName: candidate.displayName ?? resolvedFromRef?.shortName ?? name,
    abbreviation: resolvedFromRef?.abbreviation,
    avatarUrl: ownImage
      ? resolveAssetUrl(pickImageVariant(ownImage), assetBase)
      : resolvedFromRef?.avatarUrl,
  };
}

function resolveCandidateType(candidate: PlatformCandidate): 'party' | 'person' {
  return candidate.references[0]?.type === 'person' ? 'person' : 'party';
}

/**
 * Coalitions show up two ways in the platform format: nested candidates (each
 * with its own sub-answers), or several `coalition-member` organization
 * references on one candidate. This fixture data only exercises the second;
 * both are ported per the source schema and old view-model.
 */
function resolveMembers(
  candidate: PlatformCandidate,
  maps: ReferenceMaps,
  assetBase: string,
): PartyRef[] {
  if (candidate.nestedCandidates?.length) {
    return candidate.nestedCandidates.map((nested) => {
      const identity = resolveCandidateIdentity(nested, maps, assetBase);
      return {
        id: nested.id,
        name: identity.name,
        shortName: identity.shortName,
        abbreviation: identity.abbreviation,
        logoUrl: identity.avatarUrl,
      };
    });
  }

  return candidate.references
    .filter((ref) => ref.relationship === 'coalition-member')
    .map((ref) => {
      const org = ref.type === 'organization' ? maps.organizations.get(ref.id) : undefined;
      if (!org) return { id: ref.id, name: ref.id, shortName: ref.id };
      const identity = resolveFromOrganization(org, assetBase);
      return {
        id: ref.id,
        name: identity.name,
        shortName: identity.shortName,
        abbreviation: identity.abbreviation,
        logoUrl: identity.avatarUrl,
      };
    });
}

function resolveFromPerson(person: PlatformPerson, assetBase: string): ResolvedIdentity {
  const name = person.name ?? `${person.givenName ?? ''} ${person.familyName ?? ''}`.trim();
  const image = findImage(person.images, ['avatar', 'portrait']);
  return {
    name,
    shortName: name,
    avatarUrl: image ? resolveAssetUrl(pickImageVariant(image), assetBase) : undefined,
  };
}

/**
 * `PlatformCalculator` is a union of three mutually exclusive shapes
 * (standalone / group / election). This flattens whichever one parsed into a
 * single set of optional fields the two adapters below can read uniformly.
 */
type CalculatorFields = {
  id: string;
  version?: string;
  key?: string;
  calculatorGroupKey?: string;
  electionId?: string;
  electionKey?: string;
  variantKey?: string;
  districtKey?: string;
  districtCode?: string;
  roundNumber?: number;
  title?: string;
  shortTitle?: string;
  description?: string;
};

function extractCalculatorFields(calculator: PlatformCalculator): CalculatorFields {
  return {
    id: calculator.id,
    version: calculator.version,
    key: 'key' in calculator ? calculator.key : undefined,
    calculatorGroupKey:
      'calculatorGroup' in calculator ? calculator.calculatorGroup.key : undefined,
    electionId: 'election' in calculator ? calculator.election.id : undefined,
    electionKey: 'election' in calculator ? calculator.election.key : undefined,
    variantKey: 'variant' in calculator ? calculator.variant?.key : undefined,
    districtKey: 'district' in calculator ? calculator.district?.key : undefined,
    districtCode: 'district' in calculator ? calculator.district?.code : undefined,
    roundNumber: 'round' in calculator ? calculator.round?.number : undefined,
    title: calculator.title,
    shortTitle: 'shortTitle' in calculator ? calculator.shortTitle : undefined,
    description: calculator.description,
  };
}

export type PlatformCalculatorSummary = CalculatorFields;

/**
 * Maps a lone `calculator.json` to the metadata a calculator-index row needs.
 * The data CDN has no index file — the app layer assembles the domain
 * `CalculatorIndex` from site config plus one of these per known calculator.
 */
export function adaptPlatformSummary(calculatorJson: unknown): PlatformCalculatorSummary {
  const parsed = platformCalculatorSchema.parse(calculatorJson);
  return extractCalculatorFields(parsed);
}

export type AdaptPlatformCalculatorInput = {
  calculator: unknown;
  questions: unknown;
  candidates: unknown;
  candidatesAnswers: unknown;
  persons?: unknown;
  organizations?: unknown;
};

/**
 * Translate one platform calculator (six files) into the canonical model.
 *
 * `persons.json` and `organizations.json` are both optional in the format —
 * a calculator fielding only party candidates (no individual people) has no
 * reason to ship an empty `persons.json`, as in the fixture this was built
 * against.
 */
export function adaptPlatformCalculator(
  input: AdaptPlatformCalculatorInput,
  options: { assetBase: string },
): Calculator {
  const calculator = platformCalculatorSchema.parse(input.calculator);
  const questions = platformQuestionsSchema.parse(input.questions);
  const candidates = platformCandidatesSchema.parse(input.candidates);
  const candidatesAnswers = platformCandidatesAnswersSchema.parse(input.candidatesAnswers);
  const persons = input.persons === undefined ? [] : platformPersonsSchema.parse(input.persons);
  const organizations =
    input.organizations === undefined ? [] : platformOrganizationsSchema.parse(input.organizations);

  const maps: ReferenceMaps = {
    persons: new Map(persons.map((p) => [p.id, p])),
    organizations: new Map(organizations.map((o) => [o.id, o])),
  };

  const domainQuestions: Question[] = questions.map((q) => ({
    id: q.id,
    title: q.title,
    statement: q.statement,
    detail: q.detail,
    tags: q.tags ?? [],
  }));

  const domainCandidates: Candidate[] = candidates.map((c) => {
    const identity = resolveCandidateIdentity(c, maps, options.assetBase);
    return {
      id: c.id,
      name: identity.name,
      shortName: identity.shortName,
      type: resolveCandidateType(c),
      motto: c.motto,
      avatarUrl: identity.avatarUrl,
      members: resolveMembers(c, maps, options.assetBase),
      // The platform candidate/organization schemas carry no contact fields
      // (no website/socials) — nothing to map here yet.
      contacts: { web: [] },
    };
  });

  // Keyed by candidate id, same "absent means never answered" contract as the
  // archive adapter. An `answer` field that is itself absent (optional in the
  // schema) is dropped rather than coerced to `null`, so it doesn't masquerade
  // as an explicit neutral position.
  const candidateAnswers: Record<string, CandidateAnswer[]> = {};
  for (const [candidateId, answers] of Object.entries(candidatesAnswers)) {
    const mapped: CandidateAnswer[] = answers
      .filter((a) => a.answer !== undefined)
      .map((a) => ({
        questionId: a.questionId,
        answer: a.answer as AnswerValue,
        comment: a.comment,
      }));
    if (mapped.length > 0) {
      candidateAnswers[candidateId] = mapped;
    }
  }

  const fields = extractCalculatorFields(calculator);

  return {
    id: fields.id,
    version: fields.version,
    // No `elections.json` among the adapted files, so the only election data
    // available here is the bare reference calculator.json carries — see A3
    // note about surfacing the resolved election title separately.
    electionId: fields.electionId ?? '',
    electionName: fields.electionKey ?? '',
    // The domain has one `districtCode` string; the platform can distinguish
    // variant/district/round independently. This falls back through them in
    // specificity order, which A3 kept: the field means "what identifies this
    // calculator within its election", and for a nationwide election that is
    // the variant. Which of the three an election divides by is not guessed
    // here — it is `districtKind` in site config, and it drives only the
    // picker's wording.
    districtCode:
      fields.districtCode ??
      fields.districtKey ??
      fields.roundNumber?.toString() ??
      fields.variantKey ??
      '',
    name:
      fields.title ??
      fields.shortTitle ??
      fields.variantKey ??
      fields.districtKey ??
      fields.key ??
      calculator.id,
    description: fields.description,
    questions: domainQuestions,
    candidates: domainCandidates,
    candidateAnswers,
  };
}
