import { describe, expect, it } from 'vitest';
import type { AnswerMap } from '../answers/answers';
import type { Calculator, Candidate, CandidateAnswer, Question } from '../domain/types';
import { getPardubiceCalculator } from '../fixtures/index';
import { buildComparison, buildResults } from './results';

function question(id: string): Question {
  return { id, title: id, statement: `Statement ${id}`, tags: [] };
}

function candidate(id: string, members: Candidate['members'] = []): Candidate {
  return { id, name: id, shortName: id, type: 'party', members, contacts: { web: [] } };
}

function calculator(
  candidates: Candidate[],
  candidateAnswers: Record<string, CandidateAnswer[]>,
  questions: Question[] = [question('q1'), question('q2'), question('q3')],
): Calculator {
  return {
    id: 'test',
    electionId: 'e',
    electionName: 'E',
    districtCode: '1',
    name: 'Test',
    questions,
    candidates,
    candidateAnswers,
  };
}

const user = (answers: AnswerMap): AnswerMap => answers;

describe('buildResults', () => {
  it('ranks comparable candidates and leaves the rest unranked', () => {
    const results = buildResults(
      calculator([candidate('a'), candidate('b'), candidate('silent')], {
        a: [
          { questionId: 'q1', answer: true },
          { questionId: 'q2', answer: true },
        ],
        b: [
          { questionId: 'q1', answer: true },
          { questionId: 'q2', answer: false },
        ],
      }),
      user({
        q1: { questionId: 'q1', answer: true },
        q2: { questionId: 'q2', answer: true },
      }),
    );

    expect(results.map((r) => [r.candidate.id, r.rank])).toEqual([
      ['a', 1],
      ['b', 2],
      ['silent', undefined],
    ]);
  });

  it('gives a coalition its members answers when it filed none of its own', () => {
    const coalition = candidate('coalition', [
      { id: 'p1', name: 'P1', shortName: 'P1' },
      { id: 'p2', name: 'P2', shortName: 'P2' },
    ]);

    const results = buildResults(
      calculator([coalition], {
        p1: [{ questionId: 'q1', answer: true }],
        p2: [{ questionId: 'q2', answer: true }],
      }),
      user({
        q1: { questionId: 'q1', answer: true },
        q2: { questionId: 'q2', answer: true },
      }),
    );

    expect(results[0]?.match.matchPercentage).toBe(100);
    expect(results[0]?.rank).toBe(1);
  });
});

describe('buildComparison', () => {
  const fixture = calculator([candidate('a')], {
    a: [
      { questionId: 'q1', answer: true, comment: 'Protože ano.' },
      { questionId: 'q2', answer: false },
      { questionId: 'q3', answer: null },
    ],
  });

  it('lists only the questions the user answered', () => {
    const entries = buildComparison(
      fixture,
      user({
        q1: { questionId: 'q1', answer: true },
        q2: { questionId: 'q2', skipped: true },
      }),
      'a',
    );

    expect(entries.map((e) => e.question.id)).toEqual(['q1']);
  });

  it('classifies agreement, and calls a neutral on either side neither', () => {
    const entries = buildComparison(
      fixture,
      user({
        q1: { questionId: 'q1', answer: true, isImportant: true },
        q2: { questionId: 'q2', answer: true },
        q3: { questionId: 'q3', answer: true },
      }),
      'a',
    );

    expect(entries.map((e) => e.agreement)).toEqual(['match', 'mismatch', 'none']);
    expect(entries[0]?.userImportant).toBe(true);
    expect(entries[0]?.candidateComment).toBe('Protože ano.');
  });

  it('reports "none" where the candidate never answered', () => {
    const entries = buildComparison(
      calculator([candidate('silent')], {}),
      user({ q1: { questionId: 'q1', answer: true } }),
      'silent',
    );

    expect(entries[0]?.candidateAnswer).toBeUndefined();
    expect(entries[0]?.agreement).toBe('none');
  });
});

/*
 * The real fixture, because the edge case this guards is a real party in it:
 * KSČM filed no answers in Pardubice and must never appear as 0 %.
 */
describe('Pardubice fixture', () => {
  it('leaves the party that never answered unranked and without a percentage', () => {
    const pardubice = getPardubiceCalculator();
    const answers: AnswerMap = Object.fromEntries(
      pardubice.questions.map((q, index) => [q.id, { questionId: q.id, answer: index % 2 === 0 }]),
    );

    const results = buildResults(pardubice, answers);
    const silent = results.find((r) => r.candidate.id.endsWith('918217'));

    expect(silent).toBeDefined();
    expect(silent?.match.matchPercentage).toBeUndefined();
    expect(silent?.rank).toBeUndefined();
    expect(results.at(-1)?.candidate.id).toBe(silent?.candidate.id);

    // Everyone else is ranked 1..n in descending order of match.
    const ranked = results.filter((r) => r.rank !== undefined);
    expect(ranked.map((r) => r.rank)).toEqual(ranked.map((_, index) => index + 1));
  });
});
