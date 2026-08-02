/**
 * Locales, message catalogs and the localized route-slug dictionary.
 *
 * Phase 3 wires this up properly. Czech is the default locale; every UI string
 * goes through the catalog from the first component that needs one.
 */
export const DEFAULT_LOCALE = 'cs' as const;
export const LOCALES = ['cs'] as const;
export type Locale = (typeof LOCALES)[number];
