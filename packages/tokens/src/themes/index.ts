import type { Theme } from '../contract';
import { alarmTheme } from './alarm.theme';
import { defaultTheme } from './default.theme';
import { dikyZeMuzemTheme } from './diky-ze-muzem.theme';
import { midnightTheme } from './midnight.theme';
import { primaTheme } from './prima.theme';

/**
 * Every built-in theme.
 *
 * A fork adds its own file next to these and registers it here — that plus a
 * message catalog is most of what re-branding the app involves.
 *
 * The partner themes (`diky-ze-muzem`, `alarm`, `prima`) are CZ embed
 * partners' brands; Phase F moves them into the per-country site config
 * alongside the embed registry that references them.
 */
export const themes = [
  defaultTheme,
  midnightTheme,
  dikyZeMuzemTheme,
  alarmTheme,
  primaTheme,
] satisfies Theme[];

/** The theme that claims `:root`; every other theme layers on top of it. */
export const BASE_THEME_NAME = defaultTheme.name;

export { alarmTheme, defaultTheme, dikyZeMuzemTheme, midnightTheme, primaTheme };
