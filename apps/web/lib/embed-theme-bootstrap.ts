import { routeSlugs } from '@vk/i18n';
import { type EmbedConfig, embedsConfig } from '../config/embeds';

/**
 * Pre-hydration theme switch for partner embeds, following the exact pattern
 * of `color-mode.ts`'s bootstrap: a fixed, module-scope script string the root
 * layout inlines so the right `data-theme` is on `<html>` before anything
 * paints.
 *
 * This has to happen before paint, not in a client component: the layout
 * server-renders `data-theme="default"`, so an effect-based switch flashes
 * default blue inside a partner's page for a frame — and the backdrop shader
 * would mount against the default palette first (it does react to the
 * attribute change, but the wash visibly re-tinting on load is its own
 * flash).
 *
 * The partner→theme map is baked in at build time from the registry, so the
 * script stays a constant with no request data in it — same CSP posture as
 * the color-mode bootstrap. Unregistered names are simply absent from the
 * map; the page 404s for them anyway.
 */
const entries: [string, EmbedConfig][] = Object.entries(embedsConfig);
const themeByPartner = Object.fromEntries(
  entries.flatMap(([name, config]) => (config.theme ? [[name, config.theme]] : [])),
);

export const bootstrapEmbedTheme = `(function () {
  var themes = ${JSON.stringify(themeByPartner)};
  var segments = location.pathname.split('/');
  if (segments[1] !== ${JSON.stringify(routeSlugs().embed)}) return;
  var theme = themes[segments[2]];
  if (theme) document.documentElement.setAttribute('data-theme', theme);
})();`;
