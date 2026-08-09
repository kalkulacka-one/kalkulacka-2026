'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CARD_SIZES,
  type CardFormat,
  paintShareCard,
  type ShareCardContent,
} from './paint-share-card';
import { type CardTheme, cardPalette, css } from './palette';
import { readThemeColors, readThemeFonts } from './read-theme-colors';
import styles from './share-card.module.css';

/**
 * A CSS gradient sampling each theme, for the dialog's picker.
 *
 * Built from the palettes themselves rather than written out in CSS, because a
 * hand-written swatch is a promise about a colour the painter derives — and the
 * two neutral ones cannot be written in CSS at all: `light-dark()` resolves
 * against the root, so a "light" chip on a dark page would come out dark.
 */
export function cardSwatches(): Record<CardTheme, string> {
  const forMode = { light: readThemeColors('light'), dark: readThemeColors('dark') };
  const sample = (theme: CardTheme) => {
    const palette = cardPalette(theme, theme === 'light' ? forMode.light : forMode.dark);
    return `linear-gradient(135deg, ${css(palette.base)}, ${css(palette.light)})`;
  };

  return {
    light: sample('light'),
    dark: sample('dark'),
    agree: sample('agree'),
    disagree: sample('disagree'),
  };
}

export type ShareCardProps = {
  content: ShareCardContent;
  theme: CardTheme;
  format: CardFormat;
  /** Longest edge of the preview, in CSS px. */
  size?: number;
  /** Announced in place of the canvas, which is otherwise opaque to a reader. */
  label: string;
};

/**
 * The card as it will be exported, drawn small.
 *
 * A `<canvas>` and not a DOM mock-up of the card: the export has to be a raster
 * anyway, and rasterising the DOM would mean either a serialiser dependency
 * (`html2canvas` and its long tail of unsupported CSS) or a second, drifting
 * implementation of the layout. Painting it once and calling the same function
 * at both sizes makes the preview a literal scale model.
 */
export function ShareCard({ content, theme, format, size = 240, label }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /*
   * Canvas takes a font as a string and silently falls back to a system face if
   * that font has not loaded yet — and Geist arrives well after first paint. So
   * the first render is deliberately deferred to `document.fonts.ready`; without
   * it the preview draws in Helvetica and then never redraws.
   */
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    let live = true;
    const done = () => {
      if (live) setFontsReady(true);
    };
    if (document.fonts?.ready) document.fonts.ready.then(done, done);
    else done();
    return () => {
      live = false;
    };
  }, []);

  const aspect = CARD_SIZES[format].width / CARD_SIZES[format].height;
  const width = Math.round(format === 'story' ? size * aspect : size);
  const height = Math.round(width / aspect);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `fontsReady` is the repaint trigger; the fonts themselves are read off the DOM.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    paintShareCard(ctx, {
      content,
      palette: cardPalette(theme, readThemeColors(theme === 'light' ? 'light' : 'dark')),
      format,
      fonts: readThemeFonts(),
      width: canvas.width,
      height: canvas.height,
    });
  }, [content, theme, format, width, height, fontsReady]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.card}
      style={{ width, height }}
      role="img"
      aria-label={label}
    />
  );
}
