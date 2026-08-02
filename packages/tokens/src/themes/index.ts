import type { Theme } from '../contract';
import { defaultTheme } from './default.theme';
import { midnightTheme } from './midnight.theme';

/**
 * Every built-in theme.
 *
 * A fork adds its own file next to these and registers it here — that plus a
 * message catalog is most of what re-branding the app involves.
 */
export const themes = [defaultTheme, midnightTheme] satisfies Theme[];

/** The theme that claims `:root`; every other theme layers on top of it. */
export const BASE_THEME_NAME = defaultTheme.name;

export { defaultTheme, midnightTheme };
