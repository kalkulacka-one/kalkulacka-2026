/**
 * The prototype interpolates ~12 dimensions in JavaScript between a 375px and a
 * 1600px layout anchor, driven by a ResizeObserver. Every one of those is a
 * straight linear ramp, which is exactly what CSS `clamp()` expresses natively.
 *
 * Doing it in CSS means no resize listener, no re-render on resize, and the
 * values stay overridable by a theme.
 */
export type FluidAnchors = {
  minViewport: number;
  maxViewport: number;
};

export const DEFAULT_FLUID_ANCHORS: FluidAnchors = {
  minViewport: 375,
  maxViewport: 1600,
};

/**
 * Build a `clamp()` that is `min` at `minViewport` and `max` at `maxViewport`,
 * ramping linearly in between and holding flat outside.
 */
export function fluid(min: number, max: number, anchors: FluidAnchors = DEFAULT_FLUID_ANCHORS) {
  const { minViewport, maxViewport } = anchors;

  if (min === max) return `${min}px`;

  const slope = (max - min) / (maxViewport - minViewport);
  const intercept = min - slope * minViewport;

  const vw = round(slope * 100);
  const base = round(intercept);
  const preferred = base === 0 ? `${vw}vw` : `${base}px + ${vw}vw`;

  // clamp() needs its bounds in ascending order regardless of ramp direction.
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);

  return `clamp(${lower}px, ${preferred}, ${upper}px)`;
}

function round(n: number) {
  return Math.round(n * 10000) / 10000;
}
