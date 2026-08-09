import { describe, expect, it } from 'vitest';
import rawCalculator from '../fixtures/data/platform/snemovni-2025-kalkulacka/calculator.json' with {
  type: 'json',
};
import rawCandidates from '../fixtures/data/platform/snemovni-2025-kalkulacka/candidates.json' with {
  type: 'json',
};
import rawCandidatesAnswers from '../fixtures/data/platform/snemovni-2025-kalkulacka/candidates-answers.json' with {
  type: 'json',
};
import rawOrganizations from '../fixtures/data/platform/snemovni-2025-kalkulacka/organizations.json' with {
  type: 'json',
};
import rawQuestions from '../fixtures/data/platform/snemovni-2025-kalkulacka/questions.json' with {
  type: 'json',
};
import { adaptPlatformCalculator, adaptPlatformSummary } from './platform';

const ASSET_BASE = 'https://data.kalkulacka.one/snemovni-2025-kalkulacka';

/**
 * Real snapshot data from data.kalkulacka.one, committed as a fixture — this
 * calculator deliberately ships no persons.json (party-only candidates), so
 * it doubles as the "optional file omitted" case.
 */
describe('adaptPlatformCalculator (snemovni-2025-kalkulacka)', () => {
  const calculator = adaptPlatformCalculator(
    {
      calculator: rawCalculator,
      questions: rawQuestions,
      candidates: rawCandidates,
      candidatesAnswers: rawCandidatesAnswers,
      organizations: rawOrganizations,
      // persons intentionally omitted
    },
    { assetBase: ASSET_BASE },
  );

  it('reads the whole calculator', () => {
    expect(calculator.questions).toHaveLength(42);
    expect(calculator.candidates).toHaveLength(23);
  });

  it('maps question fields 1:1 (the domain shape was designed after this one)', () => {
    const question = calculator.questions.find(
      (q) => q.id === '30e04a1c-5aae-46c8-b4c3-a990524b5b2f',
    );

    expect(question?.title).toBe('Celostátní referendum');
    expect(question?.statement).toBe('Občané mají mít právo iniciovat celostátní referendum.');
    expect(question?.detail).toContain('Švýcarsku');
    expect(question?.tags).toEqual(['Právo, sprav. a stát']);
  });

  it('resolves a party candidate name and logo from its organization reference', () => {
    // References the Pirates organization but carries no displayName of its own.
    const pirates = calculator.candidates.find(
      (c) => c.id === '7f4d2b9f-28ad-4f55-aef1-a5a1ad5e5f92',
    );

    expect(pirates?.name).toBe('Česká pirátská strana');
    expect(pirates?.shortName).toBe('Piráti');
    expect(pirates?.type).toBe('party');
    // The organization has both a "logo" and an "avatar" image; a party's own
    // logo should win over the generic avatar crop.
    expect(pirates?.avatarUrl).toBe(
      `${ASSET_BASE}/images/57104e21-1108-4731-b273-7adfa944798e/logotyp.sm.webp`,
    );
  });

  it('spot-checks one candidate answer with a comment', () => {
    const rebelove = calculator.candidateAnswers['5ce1deab-ca02-4768-bff9-59bff4a3bcce'];
    const answer = rebelove?.find((a) => a.questionId === '9bb4987d-09f6-4bdb-977e-1c796ab5aabe');

    expect(answer?.answer).toBe(false);
    expect(answer?.comment).toBe('Máme dobře nastavenou migrační politiku.');
  });

  it('keeps an explicit neutral answer as null, distinct from an absent one', () => {
    const rebelove = calculator.candidateAnswers['5ce1deab-ca02-4768-bff9-59bff4a3bcce'];
    const neutral = rebelove?.find((a) => a.questionId === '9e3617ce-e872-424a-971b-1f45455231fe');

    expect(neutral?.answer).toBeNull();
  });

  it('resolves the SPOLU coalition into its member parties', () => {
    const spolu = calculator.candidates.find(
      (c) => c.id === '4bc67746-dc67-4d3e-9685-47567f905554',
    );

    expect(spolu?.name).toBe('SPOLU');
    expect(spolu?.members).toHaveLength(3);
    expect(spolu?.members.map((m) => m.abbreviation).sort()).toEqual(['KDU-ČSL', 'ODS', 'TOP 09']);
  });
});

describe('adaptPlatformSummary', () => {
  it('extracts election/variant keys from a lone calculator.json', () => {
    const summary = adaptPlatformSummary(rawCalculator);

    expect(summary.id).toBe('75c4b804-ed05-4029-b561-5255ec97848c');
    expect(summary.calculatorGroupKey).toBe('snemovni-2025');
    expect(summary.electionKey).toBe('snemovni-2025');
    expect(summary.variantKey).toBe('kalkulacka');
    expect(summary.description).toBe('Ta pravá Volební kalkulačka pro Sněmovní volby 2025');
  });
});

/**
 * The real fixture happens to have every candidate answer every question, so
 * it can't exercise "no entry at all" — every one of its `answer` fields is
 * present (`true`/`false`/`null`). This constructs the sparse cases directly.
 */
describe('adaptPlatformCalculator (absent vs. null answers)', () => {
  const CANDIDATE_ANSWERED = '00000000-0000-4000-8000-0000000000a1';
  const CANDIDATE_ONLY_SKIPPED = '00000000-0000-4000-8000-0000000000b1';
  const CANDIDATE_NEVER_ANSWERED = '00000000-0000-4000-8000-0000000000c1';

  const calculator = adaptPlatformCalculator(
    {
      calculator: {
        id: '00000000-0000-4000-8000-000000000001',
        createdAt: '2025-01-01T00:00:00+00:00',
        key: 'test-calculator',
        shortTitle: 'Test calculator',
      },
      questions: [
        {
          id: '00000000-0000-4000-8000-000000000002',
          title: 'Q1',
          statement: 'Statement one.',
        },
      ],
      candidates: [
        { id: CANDIDATE_ANSWERED, references: [] },
        { id: CANDIDATE_ONLY_SKIPPED, references: [] },
        { id: CANDIDATE_NEVER_ANSWERED, references: [] },
      ],
      candidatesAnswers: {
        [CANDIDATE_ANSWERED]: [
          { questionId: '00000000-0000-4000-8000-000000000002', answer: true },
          // No `answer` field at all — an unanswered question, not a `null` one.
          { questionId: '00000000-0000-4000-8000-000000000003' },
        ],
        // Every entry lacks `answer` — this candidate should end up with no
        // entry in `candidateAnswers`, same as never answering.
        [CANDIDATE_ONLY_SKIPPED]: [{ questionId: '00000000-0000-4000-8000-000000000002' }],
        // CANDIDATE_NEVER_ANSWERED has no key here at all.
      },
    },
    { assetBase: ASSET_BASE },
  );

  it('drops an answer entry whose `answer` field is absent, rather than treating it as neutral', () => {
    const answers = calculator.candidateAnswers[CANDIDATE_ANSWERED];

    expect(answers).toHaveLength(1);
    expect(answers?.[0]?.questionId).toBe('00000000-0000-4000-8000-000000000002');
  });

  it('omits a candidate entirely once all its answers are filtered out', () => {
    expect(calculator.candidateAnswers[CANDIDATE_ONLY_SKIPPED]).toBeUndefined();
  });

  it('omits a candidate that was never in candidatesAnswers at all', () => {
    expect(calculator.candidateAnswers[CANDIDATE_NEVER_ANSWERED]).toBeUndefined();
  });
});
