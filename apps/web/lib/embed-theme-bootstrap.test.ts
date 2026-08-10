import { describe, expect, it } from 'vitest';
import { embedsConfig } from '../config/embeds';
import { bootstrapEmbedTheme } from './embed-theme-bootstrap';

describe('bootstrapEmbedTheme', () => {
  it('bakes every themed partner into the pre-paint script', () => {
    for (const [partner, config] of Object.entries(embedsConfig)) {
      if ('theme' in config) {
        expect(bootstrapEmbedTheme).toContain(`"${partner}":"${config.theme}"`);
      }
    }
  });

  it('is anchored to the embed slug, not to any path with a matching segment', () => {
    expect(bootstrapEmbedTheme).toContain(`segments[1] !== "embed"`);
  });
});
