import { renderShaderStill } from '../backdrop/shader-renderer';
import { LOGO_PATHS, LOGO_VIEWBOX } from '../logo/logo-paths';
import { type CardPalette, css, type Rgb, toShaderRgb } from './palette';

export const CARD_FORMATS = ['story', 'landscape'] as const;
export type CardFormat = (typeof CARD_FORMATS)[number];

/**
 * Export sizes. Story is Instagram/TikTok's 9:16; landscape is 16:9, which is
 * what every other surface — a tweet, a Telegram preview, a slide — crops
 * least badly. Both are the sizes those platforms upscale *to*, so exporting
 * at them means nothing is resampled on the way in.
 */
export const CARD_SIZES: Record<CardFormat, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  landscape: { width: 1920, height: 1080 },
};

/** One line of the ranking. Purely presentational — no domain types here. */
export type ShareCardEntry = {
  rank: number;
  name: string;
  /** Pre-formatted by the caller, so the locale's own percent shape survives ("63 %"). */
  percentLabel?: string;
  /** 0–100. Sets the bar's length; omitted for a candidate who answered nothing. */
  matchPercentage?: number;
  /** Shown in place of the percentage. */
  noAnswerLabel?: string;
};

export type ShareCardContent = {
  title: string;
  /** Election and district, already joined by the caller. */
  subtitle?: string;
  entries: readonly ShareCardEntry[];
  /** A line under the ranking — how many questions were answered. */
  note?: string;
  /** The site to type in. Bottom-right in landscape, under the note in story. */
  url?: string;
};

export type PaintShareCardOptions = {
  content: ShareCardContent;
  palette: CardPalette;
  format: CardFormat;
  fonts: { display: string; sans: string };
  /**
   * Rendered pixel size. Defaults to the format's export size; the dialog's
   * preview passes something much smaller and everything scales with it.
   */
  width?: number;
  height?: number;
  /** The shader's clock. Fixed by default so a preview and its export match. */
  time?: number;
};

/** A rounded rectangle without relying on `roundRect`, which Safari only grew in 16.4. */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/** Trim to fit, with an ellipsis, measuring in the font already set on `ctx`. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (ctx.measureText(`${text.slice(0, mid).trimEnd()}…`).width <= maxWidth) low = mid;
    else high = mid - 1;
  }

  return `${text.slice(0, low).trimEnd()}…`;
}

/** The wordmark, drawn from the same path data the SVG component uses. */
function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, height: number, ink: Rgb) {
  const scale = height / LOGO_VIEWBOX.height;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = css(ink);
  for (const d of LOGO_PATHS) ctx.fill(new Path2D(d));
  ctx.restore();
}

/**
 * The wash, painted into the card.
 *
 * The blur and the 1.08 upscale mirror what `backdrop.module.css` does on
 * screen — without them the shader's blobs have visible edges, and the card
 * would not look like the app it came from. Canvas filters are unavailable in
 * some engines (notably older Safari), so the blur is treated as optional
 * polish rather than something to depend on.
 */
function drawWash(
  ctx: CanvasRenderingContext2D,
  palette: CardPalette,
  width: number,
  height: number,
  time: number,
) {
  ctx.fillStyle = css(palette.base);
  ctx.fillRect(0, 0, width, height);

  const still = renderShaderStill(
    Math.round(width / 2),
    Math.round(height / 2),
    {
      base: toShaderRgb(palette.base),
      accentA: toShaderRgb(palette.accentA),
      accentB: toShaderRgb(palette.accentB),
      light: toShaderRgb(palette.light),
    },
    time,
  );

  ctx.save();
  if (still) {
    ctx.filter = `blur(${Math.round(width * 0.026)}px)`;
    const overscan = 0.04;
    ctx.drawImage(
      still,
      -width * overscan,
      -height * overscan,
      width * (1 + overscan * 2),
      height * (1 + overscan * 2),
    );
  } else {
    // No WebGL: the same two-accent, lifted-centre shape as `FallbackGradient`.
    const lift = ctx.createRadialGradient(
      width / 2,
      height * 0.45,
      0,
      width / 2,
      height * 0.45,
      Math.max(width, height) * 0.6,
    );
    lift.addColorStop(0, css(palette.light, 0.55));
    lift.addColorStop(1, css(palette.light, 0));

    for (const [color, cx, cy] of [
      [palette.accentA, 0.2, 0.25],
      [palette.accentB, 0.8, 0.75],
    ] as const) {
      const blob = ctx.createRadialGradient(
        width * cx,
        height * cy,
        0,
        width * cx,
        height * cy,
        Math.max(width, height) * 0.5,
      );
      blob.addColorStop(0, css(color, 0.16));
      blob.addColorStop(1, css(color, 0));
      ctx.fillStyle = blob;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.fillStyle = lift;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

/**
 * Paint one share card onto a 2D context.
 *
 * The single source of truth for what the image looks like: the dialog's
 * preview calls this at a couple of hundred pixels wide and the export calls it
 * at 1080, with the same content and the same fixed shader time. What is
 * previewed is therefore what is shared, rather than an approximation of it —
 * which is why the card is drawn rather than rasterised out of the DOM.
 */
export function paintShareCard(
  ctx: CanvasRenderingContext2D,
  {
    content,
    palette,
    format,
    fonts,
    width = CARD_SIZES[format].width,
    height = CARD_SIZES[format].height,
    // Not zero: at t=0 every blob sits at its base position and the wash is
    // near-symmetric. A few seconds in it has drifted into something with a
    // direction to it.
    time = 6.5,
  }: PaintShareCardOptions,
) {
  /* Everything below is authored against the format's export size and scaled
     as a whole, so a 216px preview is the 1080px image and not a re-layout. */
  const scale = width / CARD_SIZES[format].width;
  const design = CARD_SIZES[format];

  drawWash(ctx, palette, width, height, time);

  ctx.save();
  ctx.scale(scale, scale);
  ctx.textBaseline = 'alphabetic';

  const story = format === 'story';
  const pad = story ? 88 : 96;
  const columnX = story ? pad : design.width * 0.42;
  const columnWidth = story ? design.width - pad * 2 : design.width - columnX - pad;

  /* Header — wordmark, title, subtitle. In landscape it is a left column
     beside the ranking; in story it stacks above it. */
  const headX = pad;
  let y = pad + (story ? 30 : 34);
  drawLogo(ctx, headX, y - 30, story ? 30 : 34, palette.text);

  y += story ? 96 : 104;
  ctx.fillStyle = css(palette.text);
  ctx.font = `600 ${story ? 78 : 74}px ${fonts.display}`;
  ctx.fillText(fitText(ctx, content.title, story ? columnWidth : columnX - pad * 1.4), headX, y);

  if (content.subtitle) {
    y += story ? 52 : 50;
    ctx.fillStyle = css(palette.textMuted);
    ctx.font = `400 ${story ? 34 : 32}px ${fonts.sans}`;
    for (const line of wrap(
      ctx,
      content.subtitle,
      story ? columnWidth : columnX - pad * 1.4,
      story ? 1 : 3,
    )) {
      ctx.fillText(line, headX, y);
      y += story ? 46 : 44;
    }
    y -= story ? 46 : 44;
  }

  /* The ranking. Row 1 is a plate — the same relationship the winner's row has
     to the rest of the list on screen — and 2–5 are plain lines under it. */
  const entries = content.entries.slice(0, 5);
  const listTop = story ? Math.max(y + 150, design.height * 0.3) : pad + 40;
  const listBottom = design.height - pad - (story ? 190 : 60);
  const rowGap = story ? 26 : 22;
  const winnerHeight = story ? 250 : 200;
  const restHeight =
    entries.length > 1
      ? (listBottom - listTop - winnerHeight - rowGap * entries.length) / (entries.length - 1)
      : 0;

  let rowY = listTop;
  for (const entry of entries) {
    const isWinner = entry.rank === 1;
    const rowHeight = isWinner ? winnerHeight : Math.max(restHeight, story ? 96 : 84);

    if (isWinner) {
      ctx.fillStyle = css(palette.surface, palette.surfaceAlpha);
      roundedRect(ctx, columnX, rowY, columnWidth, rowHeight, 40);
      ctx.fill();
      ctx.strokeStyle = css(palette.border, palette.surfaceAlpha);
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const innerX = columnX + (isWinner ? 44 : 8);
    const innerWidth = columnWidth - (isWinner ? 88 : 16);
    const nameSize = isWinner ? (story ? 54 : 50) : story ? 40 : 38;
    const percentSize = isWinner ? (story ? 76 : 70) : story ? 44 : 42;

    ctx.font = `600 ${percentSize}px ${fonts.display}`;
    const percentText = entry.percentLabel ?? entry.noAnswerLabel ?? '';
    const percentWidth = percentText ? ctx.measureText(percentText).width : 0;

    /* The rank sits in its own fixed gutter so five names start on one line
       however wide the numbers get. */
    const rankWidth = isWinner ? 0 : story ? 56 : 52;
    ctx.font = `400 ${story ? 34 : 32}px ${fonts.sans}`;
    if (!isWinner) {
      ctx.fillStyle = css(palette.textMuted);
      ctx.fillText(String(entry.rank), innerX, rowY + rowHeight / 2 + 12);
    }

    ctx.font = `${isWinner ? 600 : 500} ${nameSize}px ${fonts.display}`;
    ctx.fillStyle = css(palette.text);
    const nameY = isWinner ? rowY + rowHeight / 2 - 8 : rowY + rowHeight / 2 + 14;
    ctx.fillText(
      fitText(ctx, entry.name, innerWidth - rankWidth - percentWidth - 32),
      innerX + rankWidth,
      nameY,
    );

    ctx.font = `600 ${percentSize}px ${fonts.display}`;
    ctx.fillStyle = css(entry.percentLabel ? palette.text : palette.textMuted);
    if (!entry.percentLabel) ctx.font = `400 ${story ? 32 : 30}px ${fonts.sans}`;
    ctx.fillText(
      percentText,
      innerX + innerWidth - ctx.measureText(percentText).width,
      isWinner ? rowY + rowHeight / 2 - 4 : rowY + rowHeight / 2 + 14,
    );

    if (isWinner) {
      // One bar, under the top match only. Five of them would turn the card
      // into a chart; one reads as emphasis.
      const barY = rowY + rowHeight - 56;
      const barWidth = innerWidth;
      ctx.fillStyle = css(palette.border, 0.5);
      roundedRect(ctx, innerX, barY, barWidth, 12, 6);
      ctx.fill();

      if (entry.matchPercentage !== undefined) {
        ctx.fillStyle = css(palette.bar);
        roundedRect(
          ctx,
          innerX,
          barY,
          Math.max(12, (barWidth * Math.min(100, Math.max(0, entry.matchPercentage))) / 100),
          12,
          6,
        );
        ctx.fill();
      }
    } else {
      ctx.strokeStyle = css(palette.border, 0.35);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(columnX, rowY + rowHeight);
      ctx.lineTo(columnX + columnWidth, rowY + rowHeight);
      ctx.stroke();
    }

    rowY += rowHeight + rowGap;
  }

  /* Footer. In story it closes the card under the ranking; in landscape it
     finishes the left column, which is otherwise mostly empty. */
  const footY = design.height - pad;
  ctx.fillStyle = css(palette.textMuted);
  ctx.font = `400 ${story ? 30 : 28}px ${fonts.sans}`;
  if (content.note) ctx.fillText(fitText(ctx, content.note, columnWidth), headX, footY - 46);
  if (content.url) {
    ctx.fillStyle = css(palette.text);
    ctx.font = `500 ${story ? 32 : 30}px ${fonts.sans}`;
    ctx.fillText(content.url, headX, footY);
  }

  ctx.restore();
}

/** Greedy word wrap, capped at `maxLines` with the last line ellipsized. */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }

  if (lines.length < maxLines && line) lines.push(line);
  const last = lines[lines.length - 1];
  if (last !== undefined) lines[lines.length - 1] = fitText(ctx, last, maxWidth);
  return lines;
}
