import { themes } from '@vk/tokens';
import { describe, expect, it } from 'vitest';
import { type EmbedConfig, embedsConfig } from './embeds';

describe('embed partner registry', () => {
  it('every theme a partner names resolves to a real token theme', () => {
    // A typo here would ship a partner whose `data-theme` matches no
    // stylesheet — silently rendering the default theme.
    const known = new Set(themes.map((theme) => theme.name));
    const entries: [string, EmbedConfig][] = Object.entries(embedsConfig);
    for (const [partner, config] of entries) {
      if (config.theme) {
        expect(known.has(config.theme), `${partner} names unknown theme "${config.theme}"`).toBe(
          true,
        );
      }
    }
  });

  it('partner names are URL- and cookie-safe', () => {
    // The name is a URL segment and a cookie-name suffix; registry membership
    // is what S7 validation checks, so the registry itself must stay clean.
    for (const name of Object.keys(embedsConfig)) {
      expect(name).toMatch(/^[a-z0-9-]{1,64}$/);
    }
  });
});
