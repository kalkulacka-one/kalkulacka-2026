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
