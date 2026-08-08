import type {
  AnswerValue,
  Calculator,
  CalculatorIndex,
  Candidate,
  CandidateAnswer,
  Question,
} from '../domain/types';
import {
  type ArchiveCalculator,
  type ArchiveIndex,
  archiveCalculatorSchema,
  archiveIndexSchema,
} from './archive-schema';

/** Archive image paths are host-relative. */
export const ARCHIVE_ASSET_BASE = 'https://archiv.volebnikalkulacka.cz';

function absoluteUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${ARCHIVE_ASSET_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

function toAnswerValue(answer: 'yes' | 'no' | 'dont_know'): AnswerValue {
  if (answer === 'yes') return true;
  if (answer === 'no') return false;
  return null;
}

/** Archive strings use "" where they mean "absent". */
function text(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Translate one archive calculator file into the canonical model.
 *
 * Field mapping worth remembering: the archive's `title` is the *statement*
 * (the big text on the card) and its `name` is the short label on the chip.
 * Reading those the other way round produces a card that looks plausible and
 * is wrong.
 */
export function adaptArchiveCalculator(
  raw: unknown,
  options: { topics?: Record<string, string> } = {},
): Calculator {
  const parsed: ArchiveCalculator = archiveCalculatorSchema.parse(raw);

  const questions: Question[] = parsed.questions.map((q) => {
    // Archive questions carry an empty `tags` array. `topics` lets a fixture
    // supply them so the two-chip card design can be exercised before the real
    // backend provides them.
    const topic = options.topics?.[q.id];

    return {
      id: q.id,
      title: q.name,
      statement: q.title,
      detail: text(q.gist ?? q.detail),
      tags: q.tags?.length ? q.tags : topic ? [topic] : [],
    };
  });

  const candidates: Candidate[] = parsed.candidates.map((c) => ({
    id: c.id,
    name: c.name,
    shortName: c.short_name ?? c.name,
    type: c.type === 'person' ? 'person' : 'party',
    description: text(c.description),
    motto: text(c.motto),
    avatarUrl: absoluteUrl(c.img_url),
    members: (c.parties ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      shortName: p.short_name ?? p.name,
      abbreviation: p.abbreviation ?? undefined,
      logoUrl: absoluteUrl(p.img_url),
    })),
    contacts: {
      web: (c.contacts?.web ?? []).map((w) => ({ url: w.url, label: w.label ?? 'web' })),
      facebook: c.contacts?.facebook ?? undefined,
      instagram: c.contacts?.instagram ?? undefined,
      twitter: c.contacts?.twitter ?? undefined,
    },
  }));

  // Grouped by candidate. Candidates who never submitted answers simply have no
  // key here — the results screen must show them as "neodpověděli" rather than
  // scoring them at 0%.
  const candidateAnswers: Record<string, CandidateAnswer[]> = {};
  for (const a of parsed.answers) {
    const list = candidateAnswers[a.candidate_id] ?? [];
    list.push({
      questionId: a.question_id,
      answer: toAnswerValue(a.answer),
      comment: text(a.comment),
    });
    candidateAnswers[a.candidate_id] = list;
  }

  return {
    id: parsed.id,
    electionId: parsed.election.id,
    electionName: parsed.election.name,
    districtCode: parsed.district_code,
    name: parsed.name,
    description: text(parsed.description),
    questions,
    candidates,
    candidateAnswers,
  };
}

/** Translate the archive's calculator index (elections + selectable districts). */
export function adaptArchiveIndex(raw: unknown): CalculatorIndex {
  const parsed: ArchiveIndex = archiveIndexSchema.parse(raw);

  /*
   * The archive has no field saying what kind of district an election is
   * divided into, but it does number senate districts and not municipalities —
   * so `show_district_code` on the election's own calculators is the fact, read
   * one level up. `some` rather than `every`: an election is senate-shaped if
   * any of its districts is numbered, which keeps a single row with a missing
   * flag from silently reclassifying the whole election.
   */
  const numbered = new Set(
    parsed.calculators.filter((c) => c.show_district_code).map((c) => c.election_id),
  );

  return {
    elections: parsed.elections.map((e) => ({
      id: e.id,
      key: e.key,
      name: e.name,
      description: text(e.description),
      districtKind: numbered.has(e.id) ? ('senate' as const) : ('municipality' as const),
      from: e.from ?? undefined,
      to: e.to ?? undefined,
    })),
    districts: parsed.calculators.map((c) => ({
      electionId: c.election_id,
      code: c.district_code,
      name: c.name,
      description: text(c.description),
      showCode: c.show_district_code ?? false,
    })),
  };
}
