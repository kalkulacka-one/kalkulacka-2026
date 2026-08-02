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
