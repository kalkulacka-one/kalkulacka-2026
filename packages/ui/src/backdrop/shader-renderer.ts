import {
  DEFAULT_INTENSITY,
  DEFAULT_LIGHT_STRENGTH,
  FRAGMENT_SHADER,
  RENDER_SCALE,
  VERTEX_SHADER,
} from './shader-source';

/** The four colours the wash is mixed from, as 0–1 RGB triples. */
export type ShaderColors = {
  base: [number, number, number];
  accentA: [number, number, number];
  accentB: [number, number, number];
  light: [number, number, number];
};

export type ShaderRenderer = {
  /** Paint one frame. `time` is the shader clock in seconds, not a timestamp. */
  draw: (time: number, colors: ShaderColors) => void;
  /** Size the drawing buffer, in device pixels. */
  resize: (width: number, height: number) => void;
};

/**
 * Compile the backdrop's shader onto a canvas and hand back a `draw`.
 *
 * Split out of `Backdrop` because the wash has a second life: the share image
 * paints the same shader into an offscreen canvas as a single still frame. The
 * two callers differ only in what drives the clock — a `requestAnimationFrame`
 * loop there, one call here — so everything up to that point lives here and
 * neither copy can drift from the other's colours or constants.
 *
 * `null` means WebGL is unavailable or the program would not link; both callers
 * have a CSS-gradient approximation to fall back to.
 */
export function createShaderRenderer(canvas: HTMLCanvasElement): ShaderRenderer | null {
  const gl = (canvas.getContext('webgl', { alpha: false, premultipliedAlpha: true }) ??
    canvas.getContext('experimental-webgl', {
      alpha: false,
      premultipliedAlpha: true,
    })) as WebGLRenderingContext | null;

  if (!gl) return null;

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };

  const program = gl.createProgram();
  const vs = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!program || !vs || !fs) return null;

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  // biome-ignore lint/correctness/useHookAtTopLevel: gl.useProgram is the WebGL API, not a React hook.
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // A single triangle big enough to cover the whole clip space.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(program, 'uRes');
  const uTime = gl.getUniformLocation(program, 'uTime');
  const uIntensity = gl.getUniformLocation(program, 'uIntensity');
  const uBase = gl.getUniformLocation(program, 'uBase');
  const uAccentA = gl.getUniformLocation(program, 'uAccentA');
  const uAccentB = gl.getUniformLocation(program, 'uAccentB');
  const uLight = gl.getUniformLocation(program, 'uLight');
  const uLightStrength = gl.getUniformLocation(program, 'uLightStrength');

  return {
    resize(width, height) {
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    draw(time, colors) {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.uniform1f(uIntensity, DEFAULT_INTENSITY);
      gl.uniform3f(uBase, ...colors.base);
      gl.uniform3f(uAccentA, ...colors.accentA);
      gl.uniform3f(uAccentB, ...colors.accentB);
      gl.uniform3f(uLight, ...colors.light);
      gl.uniform1f(uLightStrength, DEFAULT_LIGHT_STRENGTH);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

/**
 * The wash as a still image, sized in real pixels rather than CSS ones.
 *
 * `RENDER_SCALE` is deliberately *not* applied: on screen the canvas is scaled
 * up under a 28px blur that hides the halving, and the share image blurs its
 * copy far less relative to its size. `null` when WebGL is unavailable.
 */
export function renderShaderStill(
  width: number,
  height: number,
  colors: ShaderColors,
  time = 0,
): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  const renderer = createShaderRenderer(canvas);
  if (!renderer) return null;

  renderer.resize(width, height);
  renderer.draw(time, colors);
  return canvas;
}

export { RENDER_SCALE };
