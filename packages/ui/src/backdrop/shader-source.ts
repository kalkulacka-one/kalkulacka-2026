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
  'uniform vec2 uRes;',
  'uniform float uTime;',
  'uniform float uIntensity;',
  'uniform vec3 uBase;',
  'uniform vec3 uAccentA;',
  'uniform vec3 uAccentB;',
  'uniform vec3 uLight;',
  'uniform float uLightStrength;',
  '',
  '// Organic domain warp for a liquid, fluid flow effect',
  'vec2 warp(vec2 p, float t) {',
  '  float n1 = sin(p.y * 3.2 + t * 0.45) + cos(p.x * 2.8 - t * 0.35);',
  '  float n2 = cos(p.x * 3.5 + t * 0.55) + sin(p.y * 2.4 + t * 0.25);',
  '  vec2 w1 = vec2(n1, n2) * 0.07;',
  '  float n3 = sin((p.x + w1.x) * 4.8 - t * 0.6);',
  '  float n4 = cos((p.y + w1.y) * 4.8 + t * 0.7);',
  '  return p + w1 + vec2(n3, n4) * 0.03;',
  '}',
  '',
  '// Dynamic path for organic liquid blob centers',
  'vec2 blobCenter(float seed, float spx, float spy, vec2 basePos, vec2 range) {',
  '  float t = uTime;',
  '  return basePos + vec2(sin(t * spx + seed) * range.x, cos(t * spy + seed * 1.37) * range.y);',
  '}',
  '',
  'void main() {',
  '  // Center coordinates relative to min dimension so blob proportions are',
  '  // consistent on mobile (portrait) and desktop, allowing neutral background to show through.',
  '  float minDim = min(uRes.x, uRes.y);',
  '  vec2 st = (gl_FragCoord.xy - 0.5 * uRes.xy) / minDim;',
  '',
  '  // Apply fluid domain warping',
  '  vec2 p = warp(st, uTime);',
  '',
  '  // Agree blobs (Accent A) stay on top-left / left side',
  '  vec2 cA1 = blobCenter(0.0, 0.20, 0.16, vec2(-0.25, -0.18), vec2(0.16, 0.20));',
  '  vec2 cA2 = blobCenter(1.8, 0.14, 0.22, vec2(-0.12, 0.22), vec2(0.18, 0.16));',
  '',
  '  // Disagree blobs (Accent B) stay on bottom-right / right side',
  '  vec2 cB1 = blobCenter(3.5, 0.18, 0.15, vec2(0.25, 0.18), vec2(0.16, 0.20));',
  '  vec2 cB2 = blobCenter(5.2, 0.15, 0.24, vec2(0.12, -0.22), vec2(0.18, 0.16));',
  '',
  '  // Distance falloffs with soft liquid radii',
  '  float rA = 0.40;',
  '  float rB = 0.40;',
  '  float dA1 = smoothstep(rA, 0.0, length(p - cA1));',
  '  float dA2 = smoothstep(rA * 0.85, 0.0, length(p - cA2));',
  '  float dB1 = smoothstep(rB, 0.0, length(p - cB1));',
  '  float dB2 = smoothstep(rB * 0.85, 0.0, length(p - cB2));',
  '',
  '  // Combined blob densities',
  '  float wA = 1.0 - (1.0 - dA1) * (1.0 - dA2);',
  '  float wB = 1.0 - (1.0 - dB1) * (1.0 - dB2);',
  '',
  '  // Prevent muddy purple/pink mix when Agree (Blue) and Disagree (Red) blend.',
  '  // Overlapping regions dampen mutual weights so colors transition smoothly',
  '  // through the neutral base background.',
  '  float wA_clean = wA * (1.0 - 0.9 * wB);',
  '  float wB_clean = wB * (1.0 - 0.9 * wA);',
  '',
  '  vec3 col = mix(uBase, uAccentA, wA_clean * 0.38 * uIntensity);',
  '  col = mix(col, uAccentB, wB_clean * 0.36 * uIntensity);',
  '',
  '  // A near-white blob through the middle, mixed *last* so it lifts whatever',
  '  // it passes over rather than being tinted by it. This is the column text',
  '  // and cards sit in: without it a content-heavy screen is a wall of type on',
  '  // flat page grey, and the wash reads as noise at the edges instead of depth.',
  '  vec2 cL1 = blobCenter(2.4, 0.11, 0.09, vec2(0.0, -0.05), vec2(0.10, 0.14));',
  '  vec2 cL2 = blobCenter(4.7, 0.08, 0.13, vec2(0.02, 0.20), vec2(0.13, 0.10));',
  '  float dL1 = smoothstep(0.62, 0.0, length(p - cL1));',
  '  float dL2 = smoothstep(0.46, 0.0, length(p - cL2));',
  '  float wL = 1.0 - (1.0 - dL1) * (1.0 - dL2);',
  '  col = mix(col, uLight, wL * uLightStrength);',
  '',
  '  gl_FragColor = vec4(col, 1.0);',
  '}',
].join('\n');

/** Authored defaults from the prototype's own controls, not the code's defensive fallbacks. */
export const DEFAULT_INTENSITY = 0.35;
/**
 * How far the light blob pulls the page toward the surface colour.
 *
 * Ours, not the prototype's — the prototype only ever had to sit behind one
 * screen that was mostly card. Kept well under half so the page still reads as
 * the page: at 1.0 the middle would simply *be* the card colour and every
 * surface on top of it would lose its edge.
 */
export const DEFAULT_LIGHT_STRENGTH = 0.55;
export const DEFAULT_SPEED = 1.5;
/** Render at half resolution and let the CSS scale + blur hide it — the blur makes the softening invisible. */
export const RENDER_SCALE = 0.5;
/** Caps the loop around ~30fps; the blur means finer motion isn't perceptible anyway. */
export const MIN_FRAME_INTERVAL_MS = 33;
