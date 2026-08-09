import cs from '../messages/cs.json' with { type: 'json' };

/**
 * Locales and message catalogs.
 *
 * Phase 3 replaces this accessor with next-intl. Components already read every
 * string from the catalog, so that swap does not touch them — which is the
 * whole point of putting this in place before there is a second locale.
 */
export const DEFAULT_LOCALE = 'cs' as const;
export const LOCALES = ['cs'] as const;
export type Locale = (typeof LOCALES)[number];

export type Messages = typeof cs;

const catalogs: Record<Locale, Messages> = { cs };

export function getMessages(locale: Locale = DEFAULT_LOCALE): Messages {
  return catalogs[locale];
}

/**
 * Everything the district picker says about one kind of thing being picked.
 *
 * Every sentence on that screen names the thing — "Vyberte město", "Hledat
 * obvod", "{count} kalkulačky" — and in Czech each one declines it differently,
 * so a kind cannot be papered over with one neutral noun plus a label. A kind
 * *is* this set of strings.
 */
export type DistrictVocabulary = {
  title: string;
  description: string;
  searchLabel: string;
  searchPlaceholder: string;
  /** Takes `{query}`. */
  empty: string;
  groupUnavailableHint: string;
  resultCount: { one: string; few: string; many: string };
};

/**
 * The kinds of thing an election can be divided into — municipalities, senate
 * obvody, calculator variants, and whatever a future country needs.
 *
 * Derived from the catalog rather than declared as a hand-written union: since
 * a kind is exactly "which vocabulary the picker speaks", the catalog is its
 * registry, and adding one costs a `picker.<kind>` section here plus the value
 * in site config — no edit to this file, to the domain types, or to the picker
 * component. The derivation keeps the compile-time check the repo relies on
 * everywhere else: `districtKind: 'variantt'` in a config still fails to
 * build, and a section that does not carry the full `DistrictVocabulary` shape
 * is not admitted to the union at all (so using it fails to build too, at the
 * config site rather than at render time).
 *
 * The trade is that `cs` is the shape authority — a locale-specific kind must
 * exist in `cs.json` too. That is already true of every other message, since
 * `Messages` is `typeof cs`.
 */
export type DistrictKind = {
  [K in keyof Messages['picker']]: Messages['picker'][K] extends DistrictVocabulary ? K : never;
}[keyof Messages['picker']];

/**
 * The kind assumed when data supplies one the catalog does not know.
 *
 * Only reachable by lying to the type system — untyped JSON config, say — which
 * is exactly when a picker that renders the wrong noun beats one that throws on
 * `undefined.title`.
 */
export const FALLBACK_DISTRICT_KIND: DistrictKind = 'municipality';

/** The picker's copy for one district kind. */
export function districtVocabulary(
  kind: DistrictKind,
  locale: Locale = DEFAULT_LOCALE,
): DistrictVocabulary {
  const { picker } = getMessages(locale);
  const section: DistrictVocabulary | undefined = picker[kind];
  return section ?? picker[FALLBACK_DISTRICT_KIND];
}

/**
 * Fill `{name}` placeholders.
 *
 * Deliberately minimal — next-intl brings real ICU handling, including the
 * Czech plural rules (1 / 2–4 / 5+) this cannot express.
 */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/**
 * A percentage, written the way the locale writes it.
 *
 * Czech puts a *non-breaking* space before the sign, so "63 %" stays one
 * unbreakable unit instead of leaving "63" at the end of a line and "%" at the
 * start of the next. The character below is an explicit `\u00a0` escape rather
 * than a typed space: three call sites had each written this template inline,
 * every one of them with a plain U+0020, under a comment asserting the opposite.
 * Written as an escape the rule is visible in the source and cannot be silently
 * undone by a reformat.
 *
 * It lives here because it is a locale decision, not an app one — English closes
 * the gap entirely ("63%"), and next-intl's number formatting will supply that
 * per-locale when a second locale lands.
 */
export function percent(value: number): string {
  return `${Math.round(value)}\u00a0%`;
}

/**
 * Czech's three cardinal forms: 1 · 2–4 · 0 and 5+.
 *
 * Hand-written because the placeholder accessor above has no ICU. The rule
 * itself is real and is what next-intl's `plural` will apply when it lands — so
 * call sites written against this need no change, only the implementation does.
 * Non-integers ("1,5 otázky") take the *few* form, matching CLDR.
 */
export function plural(count: number, forms: { one: string; few: string; many: string }): string {
  if (!Number.isInteger(count)) return format(forms.few, { count });
  if (count === 1) return format(forms.one, { count });
  if (count >= 2 && count <= 4) return format(forms.few, { count });
  return format(forms.many, { count });
}
