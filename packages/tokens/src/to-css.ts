import type { Theme } from './contract';
import { DEFAULT_FLUID_ANCHORS, type FluidAnchors, fluid } from './fluid';

/**
 * The fluid scale, as measured off the prototype's two layout anchors.
 *
 * `[narrow, wide]` in px. Equal values mean the dimension does not ramp; it
 * still gets a token so components never carry a raw number.
 */
const FLUID_SCALE = {
  gutter: [18, 44],
  'header-top': [8, 28],
  'brand-size': [11, 13],
  'progress-top': [10, 26],

  'question-size': [27, 35],
  'gist-size': [15.5, 17],
  'chip-size': [13.5, 14.5],
  'action-label-size': [19, 19],

  'card-pad-top': [20, 38],
  'card-pad-side': [18, 36],
  'card-pad-bottom': [18, 32],

  'star-size': [52, 70],
  'action-height': [58, 78],
  'action-radius': [16, 22],
  'nav-height': [62, 86],
} as const satisfies Record<string, readonly [number, number]>;

/**
 * Render a theme as a CSS rule.
 *
 * Only what the theme actually sets is emitted; `base.css` supplies the
 * defaults and every derived variant. That is what keeps a partner theme file
 * short enough to read in one sitting.
 */
export function themeToCss(theme: Theme, { selector }: { selector?: string } = {}): string {
  const decls = themeToDeclarations(theme);
  // Scoped by default. Only the base theme claims `:root` (see build-themes),
  // so loading extra themes never changes the app until one is selected.
  const scope = selector ?? `[data-theme='${theme.name}']`;
  const body = Object.entries(decls)
    .map(([prop, value]) => `  ${prop}: ${value};`)
    .join('\n');

  return `${scope} {\n${body}\n}\n`;
}

/**
 * The same output as a flat map, for applying a theme at runtime (a per-calculator
 * brand coming from the backend) instead of shipping it as a stylesheet.
 */
export function themeToDeclarations(theme: Theme): Record<string, string> {
  const out: Record<string, string> = {};
  const set = (name: string, value: string | undefined) => {
    if (value !== undefined) out[`--vk-${name}`] = value;
  };

  set('typeface-display', theme.typeface?.display);
  set('typeface-sans', theme.typeface?.sans);
  set('typeface-question', theme.typeface?.question ?? theme.typeface?.display);
  set('typeface-mono', theme.typeface?.mono);

  for (const [key, value] of Object.entries(theme.color ?? {})) {
    set(`color-${kebab(key)}`, value);
  }

  set('radius-card', theme.radius?.card);
  set('radius-chip', theme.radius?.chip);
  set('radius-pill', theme.radius?.pill);

  set('duration-fast', theme.motion?.durationFast);
  set('duration-base', theme.motion?.durationBase);
  set('duration-slow', theme.motion?.durationSlow);
  set('easing-spring', theme.motion?.easingSpring);
  set('easing-exit', theme.motion?.easingExit);

  set('backdrop', theme.backdrop);

  const anchors: FluidAnchors = {
    minViewport: theme.fluid?.minViewport ?? DEFAULT_FLUID_ANCHORS.minViewport,
    maxViewport: theme.fluid?.maxViewport ?? DEFAULT_FLUID_ANCHORS.maxViewport,
  };

  for (const [name, [min, max]] of Object.entries(FLUID_SCALE)) {
    set(`fluid-${name}`, fluid(min, max, anchors));
  }

  // The answer buttons ramp with the layout, so their radius is fluid unless a
  // theme pins it.
  set('radius-control', theme.radius?.control ?? fluid(16, 22, anchors));

  return out;
}

function kebab(value: string) {
  return value.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}
