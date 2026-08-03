import { describe, expect, it } from 'vitest';
import { type AnswerMap, setAnswer, skipQuestion, toggleImportant } from '../answers/answers';
import type { Question } from '../domain/types';
import {
  buildRecapFilters,
  countRecapTopics,
  countRecapTotals,
  filterRecapQuestions,
  matchesRecapFilter,
  RECAP_FILTER_ALL,
  RECAP_FILTER_IMPORTANT,
  RECAP_FILTER_UNANSWERED,
  topicFilterId,
  toRecapAnswerTone,
} from './recap';

/** Named rather than indexed so the assertions below read as what they test. */
const question = (id: string, tags: string[]): Question => ({
  id,
  title: id,
  statement: id,
  tags,
});

/** q1/q2 share a topic, q3 has another, q4 has none — every branch of `topicOf`. */
const q1 = question('q1', ['Doprava']);
/** A second tag, to pin down that only the first one is the topic. */
const q2 = question('q2', ['Doprava', 'Ignored']);
const q3 = question('q3', ['Bydlení']);
const q4 = question('q4', []);

const questions: Question[] = [q1, q2, q3, q4];

const labels = { all: 'Vše', unanswered: 'Nezodpovězené', important: 'Důležité' };

describe('toRecapAnswerTone', () => {
  it('maps a position to its side', () => {
    expect(toRecapAnswerTone(true)).toBe('agree');
    expect(toRecapAnswerTone(false)).toBe('disagree');
  });

  it('reads an explicit neutral and a missing answer the same', () => {
    expect(toRecapAnswerTone(null)).toBe('none');
    expect(toRecapAnswerTone(undefined)).toBe('none');
  });
});

describe('matchesRecapFilter', () => {
  const answers: AnswerMap = toggleImportant(setAnswer({}, 'q1', true), 'q3');

  it('keeps everything under "all"', () => {
    expect(questions.every((q) => matchesRecapFilter(q, answers, RECAP_FILTER_ALL))).toBe(true);
  });

  it('treats an answered question as no longer unanswered', () => {
    expect(matchesRecapFilter(q1, answers, RECAP_FILTER_UNANSWERED)).toBe(false);
    expect(matchesRecapFilter(q2, answers, RECAP_FILTER_UNANSWERED)).toBe(true);
  });

  it('counts a skipped question as unanswered', () => {
    const skipped = skipQuestion(answers, 'q2');
    expect(matchesRecapFilter(q2, skipped, RECAP_FILTER_UNANSWERED)).toBe(true);
  });

  it('matches only starred questions under "important"', () => {
    expect(matchesRecapFilter(q3, answers, RECAP_FILTER_IMPORTANT)).toBe(true);
    expect(matchesRecapFilter(q1, answers, RECAP_FILTER_IMPORTANT)).toBe(false);
  });

  it('matches a topic on the first tag only', () => {
    const doprava = topicFilterId('Doprava');
    expect(matchesRecapFilter(q2, answers, doprava)).toBe(true);
    expect(matchesRecapFilter(q2, answers, topicFilterId('Ignored'))).toBe(false);
  });

  it('does not confuse a topic named "all" with the "all" filter', () => {
    const named = question('qx', ['all']);
    expect(matchesRecapFilter(q1, answers, topicFilterId('all'))).toBe(false);
    expect(matchesRecapFilter(named, answers, topicFilterId('all'))).toBe(true);
  });
});

describe('filterRecapQuestions', () => {
  it('carries the index into the unfiltered list', () => {
    const entries = filterRecapQuestions(questions, {}, topicFilterId('Bydlení'));
    expect(entries).toHaveLength(1);
    expect(entries[0]?.index).toBe(2);
    expect(entries[0]?.question.id).toBe('q3');
  });

  it('can leave nothing', () => {
    expect(filterRecapQuestions(questions, {}, topicFilterId('Nic'))).toEqual([]);
  });
});

describe('countRecapTopics', () => {
  it('counts by first tag, in the order the questions introduce them', () => {
    expect(countRecapTopics(questions)).toEqual([
      ['Doprava', 2],
      ['Bydlení', 1],
    ]);
  });

  it('ignores questions with no tags', () => {
    expect(countRecapTopics([q4])).toEqual([]);
  });
});

describe('countRecapTotals', () => {
  it('splits answered from remaining', () => {
    const answers = setAnswer(setAnswer({}, 'q1', true), 'q2', false);
    expect(countRecapTotals(questions, answers)).toEqual({
      total: 4,
      answered: 2,
      remaining: 2,
      important: 0,
    });
  });

  it('leaves a skipped question in the remaining bucket', () => {
    const answers = skipQuestion(setAnswer({}, 'q1', true), 'q2');
    expect(countRecapTotals(questions, answers).remaining).toBe(3);
  });

  it('counts a star armed before any answer', () => {
    expect(countRecapTotals(questions, toggleImportant({}, 'q1')).important).toBe(1);
  });
});

describe('buildRecapFilters', () => {
  it('offers only "all" and the topics when everything is answered and nothing starred', () => {
    const answers = questions.reduce<AnswerMap>((acc, q) => setAnswer(acc, q.id, true), {});
    expect(buildRecapFilters(questions, answers, labels).map((o) => o.id)).toEqual([
      RECAP_FILTER_ALL,
      topicFilterId('Doprava'),
      topicFilterId('Bydlení'),
    ]);
  });

  it('offers the progress filters only when they would leave something', () => {
    const answers = toggleImportant({}, 'q1');
    expect(buildRecapFilters(questions, answers, labels).map((o) => o.id)).toEqual([
      RECAP_FILTER_ALL,
      RECAP_FILTER_UNANSWERED,
      RECAP_FILTER_IMPORTANT,
      topicFilterId('Doprava'),
      topicFilterId('Bydlení'),
    ]);
  });

  it('separates the topics from the progress filters exactly once', () => {
    const options = buildRecapFilters(questions, {}, labels);
    expect(options.filter((o) => o.separatorBefore).map((o) => o.id)).toEqual([
      topicFilterId('Doprava'),
    ]);
  });

  it('labels each chip and counts what it would leave', () => {
    const options = buildRecapFilters(questions, {}, labels);
    expect(options[0]).toEqual({ id: RECAP_FILTER_ALL, label: 'Vše', count: 4 });
    expect(options[1]).toEqual({ id: RECAP_FILTER_UNANSWERED, label: 'Nezodpovězené', count: 4 });
  });

  it('every offered filter leaves at least one question', () => {
    const answers = toggleImportant(setAnswer({}, 'q1', true), 'q3');

    for (const option of buildRecapFilters(questions, answers, labels)) {
      expect(filterRecapQuestions(questions, answers, option.id).length).toBeGreaterThan(0);
    }
  });
});
