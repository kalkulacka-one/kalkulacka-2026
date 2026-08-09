'use client';

import { useEffect, useRef } from 'react';
import { createShaderRenderer } from '../backdrop/shader-renderer';
import { Logo } from '../logo/logo';
import { MatchRow } from '../match-row/match-row';
import { CARD_SIZES, type CardFormat } from './card-format';
import styles from './share-card-layout.module.css';
import { type CardColorSet, cardColorScheme, cardCssVars, css, washColors } from './theme-colors';

/** One line of the ranking. Purely presentational — no domain types here. */
export type ShareCardEntry = {
  rank: number;
  name: string;
  avatarUrl?: string;
  /** Pre-formatted by the caller, so the locale's own percent shape survives ("63 %"). */
  percentLabel?: string;
  /** 0–100. Sets the bar's length; omitted for a candidate who answered nothing. */
  matchPercentage?: number;
  /** Shown in place of the percentage. */
  noAnswerLabel?: string;
};

export type ShareCardContent = {
  /** The product name — "Volební kalkulačka" — set next to the mark, same as `AppHeader`. */
  brand: string;
  /** Election and district, already joined by the caller — sits under `brand`. */
  subtitle?: string;
  /** The card's own headline, e.g. "Moje shoda". */
  title: string;
  /** The top row's caption — e.g. "Největší shoda". */
  winnerLabel?: string;
  entries: readonly ShareCardEntry[];
  /** The site to type in. */
  url?: string;
};

const noop = () => {};

/** Never a real interaction: this list is a picture of a ranking, not one to open. */
function StaticMatchRow(props: Omit<Parameters<typeof MatchRow>[0], 'selected' | 'onSelect'>) {
  return <MatchRow {...props} selected={false} onSelect={noop} />;
}

/**
 * The wash, painted directly at export resolution.
 *
 * Unlike the on-screen `Backdrop`, this never halves its render target — a
 * story image is looked at zoomed in, not glanced at behind foreground
 * content, so the softening that hides a halved canvas there would show up as
 * visible blur-scale mismatch here. The blur radius and 1.08× overscan below
 * are the same trick `backdrop.module.css` uses, just applied to a canvas at
 * its true size instead of a pre-shrunk one.
 *
 * Also stronger than the live backdrop: on screen the wash sits *behind* a
 * page of opaque cards and has to stay quiet so it never competes with them.
 * Here it more or less *is* the picture — the only thing behind the ranking —
 * so it is allowed to read as deliberately colourful rather than a hint of one.
 */
function Wash({ colors, width, height }: { colors: CardColorSet; width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createShaderRenderer(canvas);
    if (!renderer) return;
    renderer.resize(width, height);
    // Not zero: at t=0 every blob sits at its base position and the wash is
    // near-symmetric. A few seconds in it has drifted into something with a
    // direction to it. Fixed rather than animated — this is a still image.
    renderer.draw(6.5, washColors(colors), { intensity: 0.62, lightStrength: 0.7 });
  }, [colors, width, height]);

  return (
    <>
      {/*
        Underneath the canvas, and only ever visible if WebGL is unavailable:
        a static approximation of the same wash, built from CSS gradients —
        the same shape `Backdrop`'s own `FallbackGradient` uses.
      */}
      <div
        className={styles.washFallback}
        aria-hidden="true"
        style={{
          background: [
            `radial-gradient(60% 50% at 50% 45%, ${css(colors.surface, 0.6)}, transparent 70%)`,
            `radial-gradient(circle at 20% 25%, ${css(colors.agree, 0.28)}, transparent 55%)`,
            `radial-gradient(circle at 80% 75%, ${css(colors.disagree, 0.24)}, transparent 55%)`,
            css(colors.page),
          ].join(', '),
        }}
      />
      <canvas ref={canvasRef} className={styles.wash} width={width} height={height} />
    </>
  );
}

export type ShareCardLayoutProps = {
  content: ShareCardContent;
  colors: CardColorSet;
  theme: 'light' | 'dark' | 'agree' | 'disagree';
  format: CardFormat;
};

/**
 * The card, at true export pixel size.
 *
 * Built entirely from the app's own components — `MatchRow`, `Avatar`,
 * `Logo` — rather than redrawn: a candidate's picture, the ranking's
 * typography and its match bar all come from the same source the results
 * screen itself renders from, so the two cannot drift apart the way a second,
 * hand-painted implementation eventually would.
 *
 * Rasterised by the caller (`renderShareCard`) via `html-to-image`; rendered
 * as-is (scaled down with a CSS `transform`) for the dialog's live preview,
 * which is why this component itself knows nothing about either job.
 */
export function ShareCardLayout({ content, colors, theme, format }: ShareCardLayoutProps) {
  const { width, height } = CARD_SIZES[format];

  return (
    <div
      className={styles.card}
      data-format={format}
      data-vk-theme-scope=""
      style={{ width, height, ...cardCssVars(colors, cardColorScheme(theme)) }}
    >
      <Wash colors={colors} width={width} height={height} />

      <div className={styles.content}>
        {/*
          The app's own lockup — mark, product name, election/district — the
          same three things `AppHeader` shows on every screen, just given the
          room a share image can afford instead of a thin top bar.
        */}
        <div className={styles.brand}>
          <Logo size={format === 'story' ? 30 : 34} className={styles.brandLogo} />
          <div className={styles.brandNames}>
            <p className={styles.brandTitle}>{content.brand}</p>
            {content.subtitle ? <p className={styles.brandSubtitle}>{content.subtitle}</p> : null}
          </div>
        </div>

        <h2 className={styles.title}>{content.title}</h2>

        {/* pointer-events: none in CSS — this is a picture of the list, not the list. */}
        <div className={styles.rowsWrap}>
          <ul className={styles.rows}>
            {content.entries.map((entry) => (
              <StaticMatchRow
                key={`${entry.rank}-${entry.name}`}
                rank={entry.rank}
                name={entry.name}
                avatarUrl={entry.avatarUrl}
                matchPercentage={entry.matchPercentage}
                percentLabel={entry.percentLabel}
                noAnswerLabel={entry.noAnswerLabel ?? ''}
                winner={entry.rank === 1}
                winnerLabel={entry.rank === 1 ? content.winnerLabel : undefined}
              />
            ))}
          </ul>
        </div>

        {content.url ? <p className={styles.url}>{content.url}</p> : null}
      </div>
    </div>
  );
}
