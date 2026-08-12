export type { ColorSet, Theme, ThemeInput } from './contract';
export { themeInputSchema } from './contract';
export { defineTheme } from './define-theme';
export { DEFAULT_FLUID_ANCHORS, type FluidAnchors, fluid } from './fluid';
export {
  alarmTheme,
  BASE_THEME_NAME,
  defaultTheme,
  dikyZeMuzemTheme,
  midnightTheme,
  primaTheme,
  themes,
} from './themes/index';
export { getColorScheme, themeToCss, themeToDeclarations } from './to-css';

export const TOKEN_PREFIX = 'vk' as const;
