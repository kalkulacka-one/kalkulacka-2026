import { describe, expect, it } from 'vitest';
import { slugifyDistrict } from './calculators';

describe('slugifyDistrict', () => {
  it('lowercases and hyphenates', () => {
    expect(slugifyDistrict('Praha hl. m.')).toBe('praha-hl-m');
  });

  it('strips diacritics', () => {
    expect(slugifyDistrict('Pardubice')).toBe('pardubice');
    expect(slugifyDistrict('Ústí nad Labem')).toBe('usti-nad-labem');
  });
});
