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
