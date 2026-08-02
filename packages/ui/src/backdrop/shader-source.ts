/**
 * The background shader, ported from the prototype almost unchanged.
 *
 * The one real change: the prototype hardcoded white/blue/red as constants.
 * Here they're uniforms fed from the active theme's page/agree/disagree
 * colours, so the backdrop follows whichever theme is applied instead of
 * staying pinned to this product's specific brand colours.
 */
export const VERTEX_SHADER = 'attribute vec2 p; void main(){ gl_Position = vec4(p,0.0,1.0); }';

export const FRAGMENT_SHADER = [
  'precision mediump float;',
  'uniform vec2 uRes; uniform float uTime; uniform float uIntensity;',
  'uniform vec3 uBase; uniform vec3 uAccentA; uniform vec3 uAccentB;',
  'vec2 pt(float seed, float spx, float spy, float rx, float ry){',
  'float t = uTime;',
  'return vec2(0.5 + sin(t*spx + seed)*rx, 0.5 + cos(t*spy + seed*1.7)*ry);',
  '}',
  'void main(){',
  'vec2 uv = gl_FragCoord.xy / uRes.xy;',
  'vec2 asp = vec2(uRes.x/uRes.y, 1.0);',
  'vec2 p = uv * asp;',
  'vec2 c1 = pt(0.0, 0.22, 0.17, 0.30, 0.26) * asp;',
  'vec2 c2 = pt(2.1, 0.16, 0.24, 0.28, 0.24) * asp;',
  'vec2 c3 = pt(4.4, 0.26, 0.14, 0.26, 0.30) * asp;',
  'vec2 c4 = pt(6.3, 0.18, 0.28, 0.30, 0.22) * asp;',
  'float d1 = smoothstep(0.62, 0.0, distance(p, c1));',
  'float d2 = smoothstep(0.58, 0.0, distance(p, c2));',
  'float d3 = smoothstep(0.62, 0.0, distance(p, c3));',
  'float d4 = smoothstep(0.58, 0.0, distance(p, c4));',
  'float wA = max(d1, d2);',
  'float wB = max(d3, d4);',
  'vec3 col = mix(uBase, uAccentA, wA * 0.34 * uIntensity);',
  'col = mix(col, uAccentB, wB * 0.30 * uIntensity);',
  'gl_FragColor = vec4(col, 1.0);',
  '}',
].join('\n');

/** Authored defaults from the prototype's own controls, not the code's defensive fallbacks. */
export const DEFAULT_INTENSITY = 0.35;
export const DEFAULT_SPEED = 1.5;
/** Render at half resolution and let the CSS scale + blur hide it — the blur makes the softening invisible. */
export const RENDER_SCALE = 0.5;
/** Caps the loop around ~30fps; the blur means finer motion isn't perceptible anyway. */
export const MIN_FRAME_INTERVAL_MS = 33;
