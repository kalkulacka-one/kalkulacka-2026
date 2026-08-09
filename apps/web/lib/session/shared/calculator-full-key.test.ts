import { describe, expect, it } from 'vitest';
import { calculatorFullKey } from './calculator-full-key';

describe('calculatorFullKey', () => {
  it('is just the key with no group', () => {
    expect(calculatorFullKey({ calculatorKey: 'kalkulacka' })).toBe('kalkulacka');
  });

  it('prefixes the group when present', () => {
    expect(
      calculatorFullKey({ calculatorKey: 'kalkulacka', calculatorGroup: 'snemovni-2025' }),
    ).toBe('snemovni-2025/kalkulacka');
  });

  it('treats null the same as no group', () => {
    expect(calculatorFullKey({ calculatorKey: 'kalkulacka', calculatorGroup: null })).toBe(
      'kalkulacka',
    );
  });
});
