'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './backdrop.module.css';
import { toRgbFloat } from './color-uniform';
import { createShaderRenderer, type ShaderColors } from './shader-renderer';
import { DEFAULT_SPEED, MIN_FRAME_INTERVAL_MS, RENDER_SCALE } from './shader-source';

export type BackdropProps = {
  /**
   * Overrides the theme's `--vk-backdrop` token. Leave unset in the app —
   * every theme decides for itself whether it wants this at all. Useful in
   * Storybook to force it on for a story regardless of the active theme.
   */
  forceEnabled?: boolean;
};

type Colors = ShaderColors;

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
  // the theme through. The `MutationObserver` alone misses one case: as long
  // as nobody has picked an explicit mode, there is no `data-mode` attribute
  // to mutate, and light/dark instead tracks the OS via `color-scheme: light
  // dark` — so an OS-level switch changes the resolved token colours without
  // touching the DOM at all. The `matchMedia` listener below is what catches
  // that case.
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

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', update);

    return () => {
      observer.disconnect();
      media.removeEventListener('change', update);
    };
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

    const renderer = createShaderRenderer(canvas);
    if (!renderer) {
      onUnsupported();
      return;
    }

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      renderer.resize(rect.width * RENDER_SCALE, rect.height * RENDER_SCALE);
    };
    resize();

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const draw = (time: number) => renderer.draw(time, colorsRef.current);

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
