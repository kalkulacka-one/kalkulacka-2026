import { describe, expect, it } from 'vitest';
import type { Calculator, Candidate, CandidateAnswer, UserAnswer } from '../domain/types';
import {
  answerToNumber,
  calculateBaseScore,
  calculateMatches,
  calculateMatchScorePercentage,
  processSingleAnswer,
} from './calculate-matches';

function candidate(id: string, members: Candidate['members'] = []): Candidate {
  return {
    id,
    name: id,
    shortName: id,
    type: 'party',
    members,
    contacts: { web: [] },
  };
}

function calculator(
  candidates: Candidate[],
  candidateAnswers: Record<string, CandidateAnswer[]>,
): Calculator {
  return {
    id: 'test',
    electionId: 'e',
    electionName: 'E',
    districtCode: '1',
    name: 'Test',
    questions: [],
    candidates,
    candidateAnswers,
  };
}

const ans = (questionId: string, answer: CandidateAnswer['answer']): CandidateAnswer => ({
  questionId,
  answer,
});

describe('answerToNumber', () => {
  it('maps the tri-state answer plus "skipped"', () => {
    expect(answerToNumber(true)).toBe(1);
    expect(answerToNumber(false)).toBe(-1);
    expect(answerToNumber(null)).toBe(0);
    expect(answerToNumber(undefined)).toBeUndefined();
  });
});

describe('calculateBaseScore', () => {
  it('is +1 when aligned and -1 when opposed', () => {
    expect(calculateBaseScore(1, 1)).toBe(1);
    expect(calculateBaseScore(-1, -1)).toBe(1);
    expect(calculateBaseScore(1, -1)).toBe(-1);
  });

  it('is 0 when either side is neutral', () => {
    expect(calculateBaseScore(0, 1)).toBe(0);
    expect(calculateBaseScore(1, 0)).toBe(0);
  });
});

describe('processSingleAnswer', () => {
  it('doubles score and weight for an important question', () => {
    const result = processSingleAnswer(
      { questionId: 'q1', answer: true, isImportant: true },
      ans('q1', true),
    );
    expect(result).toEqual({ questionId: 'q1', score: 2, weight: 2 });
  });

  it('doubles a disagreement too, so importance cuts both ways', () => {
    const result = processSingleAnswer(
      { questionId: 'q1', answer: true, isImportant: true },
      ans('q1', false),
    );
    expect(result).toEqual({ questionId: 'q1', score: -2, weight: 2 });
  });

  it('gives zero weight when the candidate did not answer', () => {
    const result = processSingleAnswer({ questionId: 'q1', answer: true }, undefined);
    expect(result).toEqual({ questionId: 'q1', score: 0, weight: 0 });
  });

  it('keeps a neutral candidate answer in the denominator', () => {
    const result = processSingleAnswer({ questionId: 'q1', answer: true }, ans('q1', null));
    expect(result).toEqual({ questionId: 'q1', score: 0, weight: 1 });
  });
});

describe('calculateMatchScorePercentage', () => {
  it('maps the [-1, 1] range onto 0–100', () => {
    expect(calculateMatchScorePercentage({ score: 4, weight: 4 })).toBe(100);
    expect(calculateMatchScorePercentage({ score: -4, weight: 4 })).toBe(0);
    expect(calculateMatchScorePercentage({ score: 0, weight: 4 })).toBe(50);
  });

  it('is undefined when nothing was comparable', () => {
    expect(calculateMatchScorePercentage({ score: 0, weight: 0 })).toBeUndefined();
  });
});

describe('calculateMatches', () => {
  const userAnswers: UserAnswer[] = [
    { questionId: 'q1', answer: true },
    { questionId: 'q2', answer: false },
    { questionId: 'q3', answer: true },
  ];

  it('ranks candidates best-first', () => {
    const calc = calculator([candidate('perfect'), candidate('opposite'), candidate('partial')], {
      perfect: [ans('q1', true), ans('q2', false), ans('q3', true)],
      opposite: [ans('q1', false), ans('q2', true), ans('q3', false)],
      partial: [ans('q1', true), ans('q2', true), ans('q3', true)],
    });

    const matches = calculateMatches(calc, userAnswers);

    expect(matches.map((m) => m.candidateId)).toEqual(['perfect', 'partial', 'opposite']);
    expect(matches[0]?.matchPercentage).toBe(100);
    // Agrees on q1 and q3, differs on q2: score 1 over weight 3.
    expect(matches[1]?.matchPercentage).toBeCloseTo(66.667, 3);
    expect(matches[2]?.matchPercentage).toBe(0);
  });

  it('excludes skipped questions from the comparison', () => {
    const calc = calculator([candidate('a')], { a: [ans('q1', true), ans('q2', true)] });

    const matches = calculateMatches(calc, [
      { questionId: 'q1', answer: true },
      { questionId: 'q2', answer: undefined },
    ]);

    expect(matches[0]?.comparedCount).toBe(1);
    expect(matches[0]?.matchPercentage).toBe(100);
  });

  it('reports a candidate with no answers as undefined, not 0%', () => {
    const calc = calculator([candidate('answered'), candidate('silent')], {
      answered: [ans('q1', true), ans('q2', false), ans('q3', true)],
    });

    const matches = calculateMatches(calc, userAnswers);

    expect(matches[0]?.candidateId).toBe('answered');
    const silent = matches.find((m) => m.candidateId === 'silent');
    expect(silent?.matchPercentage).toBeUndefined();
    expect(silent?.comparedCount).toBe(0);
  });

  it('sorts candidates with no answers last', () => {
    const calc = calculator([candidate('silent'), candidate('opposed')], {
      opposed: [ans('q1', false), ans('q2', true), ans('q3', false)],
    });

    const matches = calculateMatches(calc, userAnswers);

    expect(matches.map((m) => m.candidateId)).toEqual(['opposed', 'silent']);
  });

  it('falls back to coalition members when the coalition itself has no answers', () => {
    const coalition = candidate('coalition', [
      { id: 'p1', name: 'P1', shortName: 'P1' },
      { id: 'p2', name: 'P2', shortName: 'P2' },
    ]);

    const calc = calculator([coalition], {
      p1: [ans('q1', true), ans('q2', false)],
      p2: [ans('q3', true)],
    });

    const matches = calculateMatches(calc, userAnswers);

    expect(matches[0]?.comparedCount).toBe(3);
    expect(matches[0]?.matchPercentage).toBe(100);
  });

  it('breaks ties deterministically by id', () => {
    const calc = calculator([candidate('zeta'), candidate('alpha')], {
      zeta: [ans('q1', true)],
      alpha: [ans('q1', true)],
    });

    const matches = calculateMatches(calc, userAnswers);
    expect(matches.map((m) => m.candidateId)).toEqual(['alpha', 'zeta']);
  });

  it('lets an important question outweigh an ordinary one', () => {
    const calc = calculator([candidate('a')], { a: [ans('q1', true), ans('q2', true)] });

    const matches = calculateMatches(calc, [
      { questionId: 'q1', answer: true, isImportant: true },
      { questionId: 'q2', answer: false },
    ]);

    // +2 (important, agreed) and -1 (ordinary, opposed) over weight 3.
    expect(matches[0]?.score).toBe(1);
    expect(matches[0]?.weight).toBe(3);
    expect(matches[0]?.matchPercentage).toBeCloseTo(66.667, 3);
  });
});
