import { describe, expect, it } from 'vitest';
import { type AnswerMap, setAnswer, skipQuestion, toggleImportant } from '../answers/answers';
import type { Calculator, Candidate, CandidateAnswer, Question } from '../domain/types';
import {
  buildAnswerDistribution,
  buildAnswerGroups,
  buildQuestionConsensus,
  buildTopicMatches,
  MIN_TOPIC_ANSWERS,
  selectAgainstTheGrain,
  selectImportant,
} from './insights';

const question = (id: string, tags: string[]): Question => ({
  id,
  title: id,
  statement: id,
  tags,
});

const candidate = (id: string, members: Candidate['members'] = []): Candidate => ({
  id,
  name: id,
  shortName: id,
  type: 'party',
  members,
  contacts: { web: [] },
});

/**
 * Four questions on "Doprava" so the topic clears `MIN_TOPIC_ANSWERS` with one
 * answer to spare, plus two on "Bydlení" so it falls under it — the two sides of
 * the threshold, in one fixture.
 */
const d1 = question('d1', ['Doprava']);
const d2 = question('d2', ['Doprava']);
const d3 = question('d3', ['Doprava']);
const d4 = question('d4', ['Doprava']);
const b1 = question('b1', ['Bydlení']);
const b2 = question('b2', ['Bydlení']);
/** No tag at all — must not become a topic of its own. */
const u1 = question('u1', []);

const questions = [d1, d2, d3, d4, b1, b2, u1];

const answersFor = (entries: Record<string, boolean | null>): CandidateAnswer[] =>
  Object.entries(entries).map(([questionId, answer]) => ({ questionId, answer }));

const alfa = candidate('alfa');
const beta = candidate('beta');
const gama = candidate('gama');
/** Answers nothing at all — the KSČM case. */
const ghost = candidate('ghost');

/**
 * Three answering parties, not two: with only two, every split is one-all and a
 * minority can never form, so nothing would ever read as against the grain.
 */
const calculator: Calculator = {
  id: 'c',
  electionId: 'e',
  electionName: 'Test',
  districtCode: '1',
  name: 'Test',
  questions,
  candidates: [alfa, beta, gama, ghost],
  candidateAnswers: {
    // Agrees with a yes-on-everything user across Doprava.
    alfa: answersFor({ d1: true, d2: true, d3: true, d4: true, b1: true, b2: false }),
    // Opposes on Doprava, agrees on Bydlení.
    beta: answersFor({ d1: false, d2: false, d3: false, d4: false, b1: true, b2: true }),
    // Breaks the ties: leaves the user in a minority of one on d4 and b2.
    gama: answersFor({ d1: true, d2: true, d3: true, d4: false, b1: true, b2: false }),
  },
};

/** Yes to everything except u1, which is skipped. */
const allYes: AnswerMap = ['d1', 'd2', 'd3', 'd4', 'b1', 'b2'].reduce(
  (acc, id) => setAnswer(acc, id, true),
  skipQuestion({}, 'u1'),
);

describe('buildAnswerDistribution', () => {
  it('splits the questions across the four states', () => {
    const answers = setAnswer(setAnswer(setAnswer({}, 'd1', true), 'd2', false), 'd3', null);

    expect(buildAnswerDistribution(questions, answers)).toEqual({
      agree: 1,
      disagree: 1,
      neutral: 1,
      unanswered: 4,
      total: 7,
    });
  });

  it('reads an explicit skip and a never-reached question the same', () => {
    const skipped = buildAnswerDistribution(questions, skipQuestion({}, 'd1'));

    expect(skipped.unanswered).toBe(questions.length);
  });

  it('always accounts for every question', () => {
    const { agree, disagree, neutral, unanswered, total } = buildAnswerDistribution(
      questions,
      allYes,
    );

    expect(agree + disagree + neutral + unanswered).toBe(total);
  });
});

describe('buildTopicMatches', () => {
  it('names the closest candidate for a topic', () => {
    const [doprava] = buildTopicMatches(calculator, allYes);

    expect(doprava?.topic).toBe('Doprava');
    expect(doprava?.best.candidate.id).toBe('alfa');
    expect(doprava?.best.matchPercentage).toBe(100);
  });

  it('drops a topic with too few answers behind it', () => {
    // Bydlení has two questions — one short of the threshold.
    expect(buildTopicMatches(calculator, allYes).map((m) => m.topic)).toEqual(['Doprava']);
  });

  it('counts answers rather than questions against the threshold', () => {
    // Every Doprava question exists, but only two were answered.
    const thin = setAnswer(setAnswer({}, 'd1', true), 'd2', true);

    expect(buildTopicMatches(calculator, thin)).toEqual([]);
  });

  it('lets the threshold be lowered', () => {
    const topics = buildTopicMatches(calculator, allYes, 2).map((m) => m.topic);

    expect(topics).toContain('Bydlení');
  });

  it("scores a topic only on that topic's own questions", () => {
    // beta opposes on all of Doprava but agrees on Bydlení, so it must win
    // Bydlení outright despite losing overall.
    const [, bydleni] = buildTopicMatches(calculator, allYes, 2);

    expect(bydleni?.topic).toBe('Bydlení');
    expect(bydleni?.best.candidate.id).toBe('beta');
  });

  it('ignores questions with no topic', () => {
    const topics = buildTopicMatches(calculator, allYes, 1).map((m) => m.topic);

    expect(topics).not.toContain(undefined);
    expect(topics).toEqual(['Doprava', 'Bydlení']);
  });

  it('reports how much the number rests on', () => {
    const [doprava] = buildTopicMatches(calculator, allYes);

    expect(doprava?.questionCount).toBe(4);
    expect(doprava?.answeredCount).toBe(4);
  });

  it('orders by how many answers back the topic, not by score', () => {
    const topics = buildTopicMatches(calculator, allYes, 1);

    expect(topics.map((m) => m.answeredCount)).toEqual([4, 2]);
  });

  it('defaults the threshold to the exported constant', () => {
    expect(buildTopicMatches(calculator, allYes)).toEqual(
      buildTopicMatches(calculator, allYes, MIN_TOPIC_ANSWERS),
    );
  });
});

describe('buildQuestionConsensus', () => {
  it('sorts the candidates onto each side', () => {
    const [first] = buildQuestionConsensus(calculator, allYes);

    expect(first?.question.id).toBe('d1');
    expect(first?.agreeing.map((c) => c.id)).toEqual(['alfa', 'gama']);
    expect(first?.opposing.map((c) => c.id)).toEqual(['beta']);
  });

  it('leaves out questions the user did not answer', () => {
    const ids = buildQuestionConsensus(calculator, allYes).map((e) => e.question.id);

    expect(ids).not.toContain('u1');
  });

  it('does not count a candidate who never answered as responding', () => {
    const [first] = buildQuestionConsensus(calculator, allYes);

    // alfa, beta and gama answered; ghost did not.
    expect(first?.respondedCount).toBe(3);
  });

  it('puts a neutral on neither side but still counts it as a response', () => {
    const withNeutral: Calculator = {
      ...calculator,
      candidateAnswers: { ...calculator.candidateAnswers, alfa: answersFor({ d1: null }) },
    };

    const [first] = buildQuestionConsensus(withNeutral, setAnswer({}, 'd1', true));

    // alfa's neutral counts as a response but joins neither side.
    expect(first?.agreeing.map((c) => c.id)).toEqual(['gama']);
    expect(first?.opposing.map((c) => c.id)).toEqual(['beta']);
    expect(first?.respondedCount).toBe(3);
  });

  it('carries the important flag through', () => {
    const starred = toggleImportant(setAnswer({}, 'd1', true), 'd1');

    expect(buildQuestionConsensus(calculator, starred)[0]?.important).toBe(true);
  });
});

describe('selectImportant', () => {
  it('keeps only the starred questions, in question order', () => {
    const starred = toggleImportant(toggleImportant(allYes, 'b1'), 'd2');
    const picked = selectImportant(buildQuestionConsensus(calculator, starred));

    expect(picked.map((e) => e.question.id)).toEqual(['d2', 'b1']);
  });
});

describe('selectAgainstTheGrain', () => {
  it('surfaces the questions where fewest parties stood with you', () => {
    // A yes on b2 puts the user with beta alone; alfa opposes.
    const picked = selectAgainstTheGrain(buildQuestionConsensus(calculator, allYes));

    expect(picked[0]?.question.id).toBe('b2');
  });

  it('leaves out questions where you were in the majority', () => {
    const consensus = buildQuestionConsensus(calculator, setAnswer({}, 'b1', true));

    // Both candidates agree on b1 — nothing contrarian about it.
    expect(selectAgainstTheGrain(consensus)).toEqual([]);
  });

  it('respects the limit', () => {
    const picked = selectAgainstTheGrain(buildQuestionConsensus(calculator, allYes), 1);

    expect(picked).toHaveLength(1);
  });

  it('judges by share rather than raw count', () => {
    // `few` drew one response and it opposed — a share of 0. `many` drew three,
    // one of which agreed — a share of a third, but two opponents rather than
    // one. Ranking on the raw number of opponents would invert these.
    const sparse: Calculator = {
      ...calculator,
      questions: [question('few', []), question('many', [])],
      candidateAnswers: {
        alfa: answersFor({ few: false, many: true }),
        beta: answersFor({ many: false }),
        gama: answersFor({ many: false }),
      },
    };

    const answers = setAnswer(setAnswer({}, 'few', true), 'many', true);
    const picked = selectAgainstTheGrain(buildQuestionConsensus(sparse, answers));

    expect(picked.map((e) => e.question.id)).toEqual(['few', 'many']);
  });
});

describe('buildAnswerGroups', () => {
  // A calculator with every kind of stance in one place: yes, no, an explicit
  // "nevím" carrying a comment, and a candidate with no record at all.
  const mixed: Calculator = {
    ...calculator,
    questions: [d1, u1],
    candidateAnswers: {
      alfa: [
        { questionId: 'd1', answer: true, comment: 'pro' },
        { questionId: 'u1', answer: false },
      ],
      beta: [{ questionId: 'd1', answer: false }],
      gama: [{ questionId: 'd1', answer: null, comment: 'váháme' }],
    },
  };

  it('covers every question, answered by the user or not', () => {
    const groups = buildAnswerGroups(mixed);

    expect(groups.map((g) => g.question.id)).toEqual(['d1', 'u1']);
  });

  it('sorts candidates by their own answer and keeps comments', () => {
    const [d1Groups] = buildAnswerGroups(mixed);

    expect(d1Groups?.yes.map((p) => p.candidate.id)).toEqual(['alfa']);
    expect(d1Groups?.yes[0]?.comment).toBe('pro');
    expect(d1Groups?.no.map((p) => p.candidate.id)).toEqual(['beta']);
  });

  it('merges neutrals and silent candidates into one group, neutrals first', () => {
    const [d1Groups] = buildAnswerGroups(mixed);

    expect(d1Groups?.other.map((p) => p.candidate.id)).toEqual(['gama', 'ghost']);
    // The neutral is a recorded answer — its comment survives; the silent
    // candidate has no answer to distinguish from "nevím" except `undefined`.
    expect(d1Groups?.other[0]?.answer).toBeNull();
    expect(d1Groups?.other[0]?.comment).toBe('váháme');
    expect(d1Groups?.other[1]?.answer).toBeUndefined();
  });

  it('accounts for every candidate on every question', () => {
    for (const group of buildAnswerGroups(mixed)) {
      const total = group.yes.length + group.no.length + group.other.length;
      expect(total).toBe(mixed.candidates.length);
    }
  });
});
