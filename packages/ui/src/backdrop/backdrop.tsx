'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './backdrop.module.css';
import { toRgbFloat } from './color-uniform';
import {
  DEFAULT_INTENSITY,
  DEFAULT_LIGHT_STRENGTH,
  DEFAULT_SPEED,
  FRAGMENT_SHADER,
  MIN_FRAME_INTERVAL_MS,
  RENDER_SCALE,
  VERTEX_SHADER,
} from './shader-source';

export type BackdropProps = {
  /**
   * Overrides the theme's `--vk-backdrop` token. Leave unset in the app —
   * every theme decides for itself whether it wants this at all. Useful in
   * Storybook to force it on for a story regardless of the active theme.
   */
  forceEnabled?: boolean;
};

type Colors = {
  base: [number, number, number];
  accentA: [number, number, number];
  accentB: [number, number, number];
  light: [number, number, number];
};

function readTokens(el: HTMLElement): { enabled: boolean; colors: Colors } {
  const cs = getComputedStyle(el);
  const backdrop = cs.getPropertyValue('--vk-backdrop').trim();

  return {
    enabled: backdrop === 'gradient',
    colors: {
      base: toRgbFloat(cs.getPropertyValue('--vk-color-page') || '#ffffff'),
      accentA: toRgbFloat(cs.getPropertyValue('--vk-color-agree') || '#2563eb'),
      accentB: toRgbFloat(cs.getPropertyValue('--vk-color-disagree') || '#dc2626'),
      // The card colour, so the bright pass through the middle is the same
      // white the content sits on — on a dark theme that is a *lighter* dark,
      // which is exactly right: it lifts without going pale.
      light: toRgbFloat(cs.getPropertyValue('--vk-color-surface') || '#ffffff'),
    },
  };
}

/**
 * The soft, animated colour wash behind the question flow — ported from the
 * prototype's WebGL shader. Two things the prototype didn't need to worry
 * about, since this app must work for any theme and any machine:
 *
 *  - Colours are theme tokens (page/agree/disagree), read live, so switching
 *    themes re-colours the backdrop instead of leaving it stuck on one
 *    brand's palette.
 *  - If WebGL isn't available, or the theme turns the backdrop off, this
 *    renders a plain CSS radial-gradient approximation (or nothing) instead
 *    of silently failing.
 *
 * `prefers-reduced-motion` gets a single static frame rather than no
 * backdrop at all — matching the prototype, which freezes time rather than
 * hiding the shader.
 */
export function Backdrop({ forceEnabled }: BackdropProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<{ enabled: boolean; colors: Colors } | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  // Tokens are read from the DOM rather than passed as props so the backdrop
  // reacts to a `data-theme` switch (e.g. Storybook's theme toolbar) or a
  // `data-mode` light/dark toggle without every call site having to plumb
  // the theme through.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const update = () => setState(readTokens(host));
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-mode'],
    });
    return () => observer.disconnect();
  }, []);

  const enabled = forceEnabled ?? state?.enabled ?? false;
  const colors = state?.colors;
  const handleUnsupported = useCallback(() => setWebglFailed(true), []);

  return (
    <div ref={hostRef} className={styles.host} aria-hidden="true">
      {enabled && colors ? (
        webglFailed ? (
          <FallbackGradient colors={colors} />
        ) : (
          <ShaderCanvas colors={colors} onUnsupported={handleUnsupported} />
        )
      ) : null}
    </div>
  );
}

function FallbackGradient({ colors }: { colors: Colors }) {
  const rgb = (c: [number, number, number]) =>
    `rgb(${c.map((v) => Math.round(v * 255)).join(' ')})`;
  return (
    <div
      className={styles.fallback}
      style={{
        // Listed light-first because CSS paints the first layer on top — the
        // same order the shader mixes in, so both paths lift the middle.
        background: `radial-gradient(60% 50% at 50% 45%, ${rgb(colors.light)}8c, transparent 70%), radial-gradient(circle at 20% 25%, ${rgb(colors.accentA)}1c, transparent 50%), radial-gradient(circle at 80% 75%, ${rgb(colors.accentB)}18, transparent 50%), ${rgb(colors.base)}`,
      }}
    />
  );
}

function ShaderCanvas({ colors, onUnsupported }: { colors: Colors; onUnsupported: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Read every frame without re-running the setup effect on every colour tick.
  const colorsRef = useRef(colors);
  colorsRef.current = colors;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext('webgl', { alpha: false, premultipliedAlpha: true }) ??
      canvas.getContext('experimental-webgl', {
        alpha: false,
        premultipliedAlpha: true,
      })) as WebGLRenderingContext | null;

    if (!gl) {
      onUnsupported();
      return;
    }

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
    if (!program || !vs || !fs) {
      onUnsupported();
      return;
    }

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      onUnsupported();
      return;
    }
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

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * RENDER_SCALE));
      canvas.height = Math.max(1, Math.round(rect.height * RENDER_SCALE));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const draw = (time: number) => {
      const c = colorsRef.current;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.uniform1f(uIntensity, DEFAULT_INTENSITY);
      gl.uniform3f(uBase, ...c.base);
      gl.uniform3f(uAccentA, ...c.accentA);
      gl.uniform3f(uAccentB, ...c.accentB);
      gl.uniform3f(uLight, ...c.light);
      gl.uniform1f(uLightStrength, DEFAULT_LIGHT_STRENGTH);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      // One static frame — the prototype freezes time rather than hiding the
      // backdrop entirely, and a still gradient carries no motion risk.
      draw(0);
      return () => ro.disconnect();
    }

    const start = performance.now();
    let raf = 0;
    let lastFrame = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - lastFrame < MIN_FRAME_INTERVAL_MS) return;
      lastFrame = now;
      draw(((now - start) / 1000) * DEFAULT_SPEED);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // Colour changes are picked up via colorsRef each frame without
    // re-initialising GL — `colors` is deliberately not a dependency here.
  }, [onUnsupported]);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}
