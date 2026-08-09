import { describe, expect, it } from 'vitest';
import { answerSchema } from './answer-schema';

const questionId = '11111111-1111-4111-8111-111111111111';

describe('answerSchema', () => {
  it('accepts the minimal shape: just a question id', () => {
    expect(answerSchema.safeParse({ questionId }).success).toBe(true);
  });

  it('accepts a fully populated answer', () => {
    const result = answerSchema.safeParse({
      questionId,
      answer: true,
      isImportant: true,
      respondent: 'candidate',
      comment: 'because',
      sources: [{ url: 'https://example.com', title: 'Example', description: 'A source' }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a null answer (neutral)', () => {
    expect(answerSchema.safeParse({ questionId, answer: null }).success).toBe(true);
  });

  it('rejects a missing questionId', () => {
    expect(answerSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a non-uuid questionId', () => {
    expect(answerSchema.safeParse({ questionId: 'not-a-uuid' }).success).toBe(false);
  });

  it('rejects an unknown top-level key', () => {
    const result = answerSchema.safeParse({ questionId, extra: 'nope' });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown key inside a source', () => {
    const result = answerSchema.safeParse({
      questionId,
      sources: [{ url: 'https://example.com', extra: 'nope' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty sources array', () => {
    expect(answerSchema.safeParse({ questionId, sources: [] }).success).toBe(false);
  });

  it('rejects an invalid respondent value', () => {
    expect(answerSchema.safeParse({ questionId, respondent: 'robot' }).success).toBe(false);
  });
});
