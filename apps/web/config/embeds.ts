/**
 * Embed partner registry — who may render this app inside an iframe, and with
 * what overrides. The shape is ported from the previous platform's
 * `config/embeds.ts`; like the election list in `site.ts`, it is per-site
 * configuration and moves into the per-country config module in Phase F.
 *
 * A partner's name is a URL segment (`/embed/<name>/…`), a cookie-name suffix
 * (`<cookie>_embed_<name>`), and a stored session attribute — which is why
 * membership here is also the *validation* for all three: anything not in the
 * registry is not an embed, so no hostile string ever reaches a cookie name or
 * the database (review item S7).
 *
 * Two fields the old config had are deliberately absent until something
 * consumes them: `logo: monochrome|color` belongs to the partner themes
 * (Phase F1 re-authors them on the token contract), and `donateCard` positions
 * a card the new results screen does not have yet.
 */
export type EmbedConfig = {
  /**
   * Token theme (`data-theme`) this partner's embed renders under. Absent =
   * the default theme. Partner themes arrive in Phase F1; the plumbing that
   * applies this is already live.
   */
  theme?: string;
  /** The wordmark's outbound link to the full site. Default true — turning it
   * off is a per-partner deal, not a default. */
  attribution?: boolean;
};

export const embedsConfig = {
  /** The generic embed — partners without a negotiated config embed this. */
  default: {},
  'diky-ze-muzem': {},
  alarm: {},
  prima: {},
  idnes: {},
  nova: {},
  e15: {},
  reflex: {},
  blesk: {},
  denik: {},
  publico: {},
  aktuality: {},
} as const satisfies Record<string, EmbedConfig>;

export type EmbedName = keyof typeof embedsConfig;

export function isEmbedName(name: string): name is EmbedName {
  return Object.hasOwn(embedsConfig, name);
}

/** The registry lookup, with defaults applied. */
export function embedConfigOf(
  name: EmbedName,
): Required<Pick<EmbedConfig, 'attribution'>> & EmbedConfig {
  return { attribution: true, ...embedsConfig[name] };
}
