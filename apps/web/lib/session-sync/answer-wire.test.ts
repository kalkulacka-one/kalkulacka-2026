import { type AnswerMap, setAnswer, skipQuestion, toggleImportant } from '@vk/core';
import { describe, expect, it } from 'vitest';
import { answerSchema } from '../api/answer-schema';
import { fromWireAnswers, toWireAnswers } from './answer-wire';

/** Real UUIDs: the wire schema rejects anything else, and so does the column. */
const AGREED = '11111111-1111-4111-8111-111111111111';
const DISAGREED = '22222222-2222-4222-8222-222222222222';
const SKIPPED = '33333333-3333-4333-8333-333333333333';
const STARRED = '44444444-4444-4444-8444-444444444444';
const SKIPPED_AND_STARRED = '55555555-5555-4555-8555-555555555555';

/**
 * Built with the store's own transitions rather than by hand, so the fixture
 * cannot drift into a shape the app never actually produces.
 */
function everyState(): AnswerMap {
  let answers: AnswerMap = {};
  answers = setAnswer(answers, AGREED, true);
  answers = toggleImportant(answers, AGREED);
  answers = setAnswer(answers, DISAGREED, false);
  answers = skipQuestion(answers, SKIPPED);
  answers = toggleImportant(answers, STARRED);
  answers = skipQuestion(answers, SKIPPED_AND_STARRED);
  answers = toggleImportant(answers, SKIPPED_AND_STARRED);
  return answers;
}

describe('toWireAnswers', () => {
  it('encodes every state the flow can produce', () => {
    expect(toWireAnswers(everyState())).toEqual([
      { questionId: AGREED, answer: true, isImportant: true },
      { questionId: DISAGREED, answer: false },
      { questionId: SKIPPED, answer: null },
      { questionId: STARRED, isImportant: true },
      { questionId: SKIPPED_AND_STARRED, answer: null, isImportant: true },
    ]);
  });

  it('keeps a skip and a star-before-answering apart — the two the wire shape does not', () => {
    const wire = toWireAnswers(everyState());
    const skipped = wire.find((entry) => entry.questionId === SKIPPED);
    const starred = wire.find((entry) => entry.questionId === STARRED);

    expect(skipped?.answer).toBeNull();
    expect(starred && 'answer' in starred).toBe(false);
  });

  it('emits entries the server accepts', () => {
    for (const entry of toWireAnswers(everyState())) {
      expect(answerSchema.safeParse(entry).success).toBe(true);
    }
  });

  it('drops an entry left holding nothing, which reads the same as never answered', () => {
    const armed = toggleImportant({}, STARRED);
    expect(toWireAnswers(toggleImportant(armed, STARRED))).toEqual([]);
  });

  it('drops a question id the column could not store rather than losing the whole save', () => {
    // Archive question ids are not UUIDs; one left over in localStorage would
    // otherwise make the server reject every answer alongside it.
    expect(toWireAnswers(setAnswer({}, 'komunalni-2022-q1', true))).toEqual([]);
  });
});

describe('answer round trip', () => {
  it('survives save and restore unchanged', () => {
    const answers = everyState();
    expect(fromWireAnswers(toWireAnswers(answers))).toEqual(answers);
  });

  it('is stable on a second pass', () => {
    const wire = toWireAnswers(everyState());
    expect(toWireAnswers(fromWireAnswers(wire))).toEqual(wire);
  });
});

describe('fromWireAnswers', () => {
  it('reads a null answer as a skip, not as an unanswered question', () => {
    expect(fromWireAnswers([{ questionId: SKIPPED, answer: null }])[SKIPPED]).toEqual({
      questionId: SKIPPED,
      answer: undefined,
      isImportant: false,
      skipped: true,
    });
  });

  it('reads an absent answer as importance armed early', () => {
    expect(fromWireAnswers([{ questionId: STARRED, isImportant: true }])[STARRED]).toEqual({
      questionId: STARRED,
      answer: undefined,
      isImportant: true,
      skipped: false,
    });
  });
});
