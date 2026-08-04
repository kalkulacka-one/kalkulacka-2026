import { describe, expect, it } from 'vitest';
import type { Question } from '../domain/types';
import {
  type AnswerMap,
  countAnswered,
  firstUnansweredIndex,
  isComplete,
  setAnswer,
  skipQuestion,
  toggleImportant,
  toSegments,
  toUserAnswers,
} from './answers';

const questions: Question[] = ['q1', 'q2', 'q3'].map((id) => ({
  id,
  title: id,
  statement: id,
  tags: [],
}));

describe('setAnswer', () => {
  it('records a position', () => {
    const answers = setAnswer({}, 'q1', true);
    expect(answers.q1).toEqual({
      questionId: 'q1',
      answer: true,
      isImportant: false,
      skipped: false,
    });
  });

  it('clears the answer when the same one is chosen again', () => {
    const once = setAnswer({}, 'q1', true);
    expect(setAnswer(once, 'q1', true)).toEqual({});
  });

  it('switches sides without clearing', () => {
    const once = setAnswer({}, 'q1', true);
    expect(setAnswer(once, 'q1', false).q1?.answer).toBe(false);
  });

  it('keeps the important flag when changing sides', () => {
    let answers = toggleImportant({}, 'q1');
    answers = setAnswer(answers, 'q1', true);
    answers = setAnswer(answers, 'q1', false);
    expect(answers.q1?.isImportant).toBe(true);
  });

  it('does not mutate its input', () => {
    const before: AnswerMap = {};
    setAnswer(before, 'q1', true);
    expect(before).toEqual({});
  });
});

describe('toggleImportant', () => {
  it('can be armed before an answer exists', () => {
    const answers = toggleImportant({}, 'q1');
    expect(answers.q1).toEqual({
      questionId: 'q1',
      answer: undefined,
      isImportant: true,
      skipped: false,
    });
  });

  it('does not read as a skip when armed before an answer exists', () => {
    const answers = toggleImportant({}, 'q1');
    expect(toSegments(questions, answers)).toEqual([
      { state: 'unanswered', important: true },
      { state: 'unanswered', important: false },
      { state: 'unanswered', important: false },
    ]);
  });

  it('toggles back off', () => {
    expect(toggleImportant(toggleImportant({}, 'q1'), 'q1').q1?.isImportant).toBe(false);
  });
});

describe('skipQuestion', () => {
  it('is distinct from never reaching the question', () => {
    const answers = skipQuestion({}, 'q1');
    expect(answers.q1).toBeDefined();
    expect(answers.q1?.answer).toBeUndefined();
    expect(countAnswered(questions, answers)).toBe(0);
  });

  it('drops an important flag armed before skipping, since it never attached to a position', () => {
    let answers = toggleImportant({}, 'q1');
    expect(answers.q1?.isImportant).toBe(true);

    answers = skipQuestion(answers, 'q1');
    expect(answers.q1?.isImportant).toBe(false);
  });
});

describe('progress helpers', () => {
  it('counts only real positions', () => {
    let answers = setAnswer({}, 'q1', true);
    answers = skipQuestion(answers, 'q2');
    expect(countAnswered(questions, answers)).toBe(1);
  });

  it('ignores stored answers to questions this calculator no longer asks', () => {
    // Answers outlive a question set in the browser, and counting the stored map
    // rather than the questions reported "43 z 42".
    let answers = setAnswer({}, 'q1', true);
    answers = setAnswer(answers, 'retired-question', true);

    expect(countAnswered(questions, answers)).toBe(1);
  });

  it('treats a skip as visited for completeness', () => {
    let answers = setAnswer({}, 'q1', true);
    answers = skipQuestion(answers, 'q2');
    expect(isComplete(questions, answers)).toBe(false);

    answers = setAnswer(answers, 'q3', false);
    expect(isComplete(questions, answers)).toBe(true);
  });

  it('finds the first unvisited question', () => {
    let answers = setAnswer({}, 'q1', true);
    expect(firstUnansweredIndex(questions, answers)).toBe(1);

    answers = skipQuestion(answers, 'q2');
    answers = setAnswer(answers, 'q3', true);
    expect(firstUnansweredIndex(questions, answers)).toBe(-1);
  });
});

describe('toSegments', () => {
  it('maps each answer onto its progress-bar state', () => {
    let answers = setAnswer({}, 'q1', true);
    answers = toggleImportant(answers, 'q1');
    answers = setAnswer(answers, 'q2', false);
    answers = skipQuestion(answers, 'q3');

    expect(toSegments(questions, answers)).toEqual([
      { state: 'agree', important: true },
      { state: 'disagree', important: false },
      { state: 'skipped', important: false },
    ]);
  });

  it('reports untouched questions as unanswered', () => {
    expect(toSegments(questions, {})).toEqual([
      { state: 'unanswered', important: false },
      { state: 'unanswered', important: false },
      { state: 'unanswered', important: false },
    ]);
  });
});

describe('toUserAnswers', () => {
  it('returns answers in question order, skipping untouched ones', () => {
    let answers = setAnswer({}, 'q3', true);
    answers = setAnswer(answers, 'q1', false);

    expect(toUserAnswers(questions, answers).map((a) => a.questionId)).toEqual(['q1', 'q3']);
  });
});
