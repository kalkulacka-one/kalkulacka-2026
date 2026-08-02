import { describe, expect, it } from 'vitest';
import { getFixtureIndex, getPardubiceCalculator } from '../fixtures/index';
import { calculateMatches } from '../matching/calculate-matches';

/**
 * These run against the real committed archive files, so they double as a
 * contract test: if the upstream shape ever changes, this fails rather than the
 * UI rendering blanks.
 */

describe('adaptArchiveCalculator (Pardubice)', () => {
  const calculator = getPardubiceCalculator();

  it('reads the whole calculator', () => {
    expect(calculator.id).toBe('komunalni-2022-555134');
    expect(calculator.name).toBe('Pardubice');
    expect(calculator.districtCode).toBe('555134');
    expect(calculator.electionName).toBe('Komunální volby 2022');
    expect(calculator.questions).toHaveLength(42);
    expect(calculator.candidates).toHaveLength(9);
  });

  it('maps the archive title to the statement and the name to the chip label', () => {
    const question = calculator.questions[0];

    // The easiest mistake to make here is swapping these two.
    expect(question?.statement).toContain('slavnostní osvětlení v době Vánoc');
    expect(question?.title).toBe('Omezení vánoční výzdoby');
    expect(question?.detail).toContain('Vídeň');
  });

  it('supplies a topic tag so the two-chip card design has something to show', () => {
    expect(calculator.questions[0]?.tags).toEqual(['Energetika']);
    expect(calculator.questions.every((q) => q.tags.length > 0)).toBe(true);
  });

  it('resolves relative image paths to absolute URLs', () => {
    const spolu = calculator.candidates.find((c) => c.shortName.startsWith('SPOLU'));

    expect(spolu?.avatarUrl).toMatch(/^https:\/\/archiv\.volebnikalkulacka\.cz\//);
    expect(spolu?.members).toHaveLength(3);
    expect(spolu?.members.map((m) => m.abbreviation).sort()).toEqual(['KDU-ČSL', 'ODS', 'TOP 09']);
  });

  it('normalises empty strings to undefined rather than rendering blanks', () => {
    const withoutDetail = calculator.questions.find((q) => q.detail === undefined);
    expect(withoutDetail).toBeDefined();
  });

  it('leaves the candidate who never answered without an entry', () => {
    const silent = calculator.candidates.find((c) => c.shortName.includes('Komunistická'));
    expect(silent).toBeDefined();
    expect(calculator.candidateAnswers[silent?.id ?? '']).toBeUndefined();

    // The other eight answered all 42.
    const answeredIds = Object.keys(calculator.candidateAnswers);
    expect(answeredIds).toHaveLength(8);
    for (const id of answeredIds) {
      expect(calculator.candidateAnswers[id]).toHaveLength(42);
    }
  });

  it('maps dont_know to an explicit neutral, not to "skipped"', () => {
    const all = Object.values(calculator.candidateAnswers).flat();
    expect(all.filter((a) => a.answer === null)).toHaveLength(31);
    expect(all.filter((a) => a.answer === true)).toHaveLength(189);
    expect(all.filter((a) => a.answer === false)).toHaveLength(116);
  });
});

describe('calculateMatches against real Pardubice data', () => {
  const calculator = getPardubiceCalculator();

  it('agreeing with a party on everything scores it 100%', () => {
    const target = calculator.candidates.find((c) => c.shortName.startsWith('SPOLU'));
    const targetAnswers = calculator.candidateAnswers[target?.id ?? ''] ?? [];

    // Echo the party's own answers back, ignoring its neutral ones.
    const userAnswers = targetAnswers
      .filter((a) => a.answer !== null)
      .map((a) => ({ questionId: a.questionId, answer: a.answer }));

    const matches = calculateMatches(calculator, userAnswers);
    const match = matches.find((m) => m.candidateId === target?.id);

    expect(match?.matchPercentage).toBe(100);
    expect(matches[0]?.candidateId).toBe(target?.id);
  });

  it('reports the silent candidate as undefined and sorts it last', () => {
    const userAnswers = calculator.questions.map((q) => ({ questionId: q.id, answer: true }));
    const matches = calculateMatches(calculator, userAnswers);

    expect(matches).toHaveLength(9);
    expect(matches.at(-1)?.matchPercentage).toBeUndefined();
    expect(matches.slice(0, 8).every((m) => typeof m.matchPercentage === 'number')).toBe(true);
  });
});

describe('adaptArchiveIndex', () => {
  const index = getFixtureIndex();

  it('lists elections and their districts', () => {
    expect(index.elections.map((e) => e.id)).toContain('komunalni-2022');

    const komunalni = index.districts.filter((d) => d.electionId === 'komunalni-2022');
    const senatni = index.districts.filter((d) => d.electionId === 'senatni-2022');

    expect(komunalni).toHaveLength(35);
    expect(senatni).toHaveLength(27);
  });

  it('flags senate districts as code-labelled and municipalities as not', () => {
    const pardubice = index.districts.find((d) => d.code === '555134');
    expect(pardubice?.name).toBe('Pardubice');
    expect(pardubice?.showCode).toBe(false);

    const senate = index.districts.find((d) => d.electionId === 'senatni-2022');
    expect(senate?.showCode).toBe(true);
  });
});
