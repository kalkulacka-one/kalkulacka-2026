import cs from '../messages/cs.json' with { type: 'json' };

/**
 * Registered locales, and everything each one decides — message catalog, URL
 * slugs, plural rule, number formatting.
 *
 * Phase 3 replaces the catalog access with next-intl. Components already read
 * every string from `getMessages()`, so that swap does not touch them — which
 * is the whole point of putting this in place before there is a second
 * locale.
 */
export const LOCALES = ['cs'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'cs';

/**
 * The canonical message shape. Every registered locale's catalog is checked
 * against it via `LocaleEntry.messages`, so a translation missing a key `cs`
 * has is a build error at the registry entry, not an `undefined` string at
 * render time.
 */
export type Messages = typeof cs;

/** The steps a calculator flow can be on. */
export type FlowStep = 'intro' | 'guide' | 'question' | 'review' | 'result' | 'comparison';

/** Localised path segments. One of these per locale. */
export type RouteSlugs = {
  /** Prefix before the election key, e.g. "volby". */
  elections: string;
  steps: Record<FlowStep, string>;
  /** Prefix for embedded views. */
  embed: string;
};

/** Everything one registered locale supplies. */
type LocaleEntry = {
  messages: Messages;
  slugs: RouteSlugs;
  pluralCategory: (count: number) => 'one' | 'few' | 'many';
  percent: (value: number) => string;
};

const locales: Record<Locale, LocaleEntry> = {
  cs: {
    messages: cs,
    slugs: {
      elections: 'volby',
      embed: 'embed',
      steps: {
        intro: 'uvod',
        guide: 'navod',
        question: 'otazka',
        review: 'rekapitulace',
        result: 'vysledek',
        comparison: 'porovnani',
      },
    },
    /**
     * Czech's three cardinal forms: 1 · 2–4 · 0 and 5+.
     *
     * Hand-written because the placeholder accessor below has no ICU. The
     * rule itself is real and is what next-intl's plural rules will apply
     * when it lands — so call sites written against `plural()` need no
     * change, only this implementation does. Non-integers ("1,5 otázky")
     * take the *few* form, matching CLDR.
     */
    pluralCategory(count) {
      if (!Number.isInteger(count)) return 'few';
      if (count === 1) return 'one';
      if (count >= 2 && count <= 4) return 'few';
      return 'many';
    },
    /**
     * Czech puts a *non-breaking* space before the sign, so "63 %" stays one
     * unbreakable unit instead of leaving "63" at the end of a line and "%"
     * at the start of the next. The character below is an explicit `\u00a0` escape
     * rather than a typed space: three call sites had each written
     * this template inline, every one of them with a plain U+0020, under a
     * comment asserting the opposite. Written as an escape the rule is
     * visible in the source and cannot be silently undone by a reformat.
     */
    percent(value) {
      return `${Math.round(value)}\u00a0%`;
    },
  },
};

/**
 * The locale this build serves.
 *
 * Read from `process.env.NEXT_PUBLIC_LOCALE` on every call rather than cached
 * at module scope — it's cheap, and it's what lets tests flip locales with
 * `vi.stubEnv` instead of re-importing the module. Unset resolves to
 * `DEFAULT_LOCALE`; a value that names no registered locale is a
 * misconfiguration and throws rather than silently falling back.
 */
export function activeLocale(): Locale {
  const raw = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_LOCALE : undefined;
  if (!raw) return DEFAULT_LOCALE;
  if ((LOCALES as readonly string[]).includes(raw)) return raw as Locale;
  throw new Error(
    `Unknown locale "${raw}" in NEXT_PUBLIC_LOCALE — known locales: ${LOCALES.join(', ')}`,
  );
}

export function getMessages(locale: Locale = activeLocale()): Messages {
  return locales[locale].messages;
}

/** The URL slugs this build's active locale renders and parses. */
export function routeSlugs(locale: Locale = activeLocale()): RouteSlugs {
  return locales[locale].slugs;
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
  locale: Locale = activeLocale(),
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

/** A percentage, written the way the active locale writes it. */
export function percent(value: number): string {
  return locales[activeLocale()].percent(value);
}

/** `count` matched against the active locale's cardinal forms. */
export function plural(count: number, forms: { one: string; few: string; many: string }): string {
  const category = locales[activeLocale()].pluralCategory(count);
  return format(forms[category], { count });
}
