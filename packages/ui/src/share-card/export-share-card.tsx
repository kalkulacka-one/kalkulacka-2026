'use client';

import { toBlob } from 'html-to-image';
import { createRoot } from 'react-dom/client';
import { CARD_SIZES, type CardFormat } from './card-format';
import { type ShareCardContent, ShareCardLayout } from './share-card-layout';
import { type CardTheme, cardColorSet, readActiveColorSets } from './theme-colors';

export type RenderShareCardOptions = {
  content: ShareCardContent;
  theme: CardTheme;
  format: CardFormat;
};

/**
 * The card at export size, as a PNG blob.
 *
 * A real (if temporary) React tree, not the preview scaled back up: a fresh
 * root is mounted off-screen at true export pixels, painted, rasterised with
 * `html-to-image`, and torn down — so what is captured is pixel-for-pixel the
 * same DOM `ShareCardLayout` renders everywhere else, avatars and all.
 * Nothing is uploaded and nothing is stored; the blob exists only in memory
 * for as long as it takes to hand off to `shareImage`/`downloadImage`.
 *
 * `host` sits at real viewport coordinates with `opacity: 0` rather than off
 * in the far distance with a huge negative offset — `Avatar`'s image is
 * `loading="lazy"`, and a browser only starts that fetch once the element is
 * judged near the viewport. A large offset routinely never crosses that
 * threshold at all, which is what silently blanked every avatar the first
 * time this was tried with `left: -99999px`.
 */
export async function renderShareCard({
  content,
  theme,
  format,
}: RenderShareCardOptions): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;

  const { width, height } = CARD_SIZES[format];
  const colors = cardColorSet(theme, readActiveColorSets());

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.inset = '0';
  host.style.opacity = '0';
  host.style.zIndex = '-1';
  host.style.pointerEvents = 'none';
  document.body.appendChild(host);

  const root = createRoot(host);

  try {
    await new Promise<void>((resolve) => {
      root.render(
        <ShareCardLayout content={content} colors={colors} theme={theme} format={format} />,
      );
      // Two frames, not one: the first commits React's own DOM, the second
      // is what guarantees the wash's `useEffect` — which draws into a
      // `<canvas>` React itself never touches — has actually run.
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const node = host.firstElementChild as HTMLElement | null;
    if (!node) return null;

    if (document.fonts?.ready) await document.fonts.ready.catch(() => undefined);
    // The winner row's bar grows in, and every row rises into place — capturing
    // mid-animation would freeze the export on a half-drawn frame.
    await Promise.all(
      node
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => undefined)),
    );

    return await toBlob(node, { width, height, pixelRatio: 1 });
  } catch {
    return null;
  } finally {
    root.unmount();
    host.remove();
  }
}

export type ShareImageResult = 'shared' | 'downloaded' | 'cancelled' | 'failed';

export type ShareImageOptions = {
  blob: Blob;
  fileName: string;
  /** Text offered alongside the image where the platform supports it. */
  title?: string;
  text?: string;
  url?: string;
};

/**
 * Hand the image to the phone, or fall back to saving it.
 *
 * `navigator.share` with a `files` array is what opens the OS sheet — Messages,
 * Instagram stories, AirDrop, Photos — so the picture reaches wherever it is
 * going without this app knowing about any of those destinations, and the
 * OS's own "Save Image" entry inside that sheet is what covers saving too:
 * this never needs a second, separate save action once that path is
 * available. Support is checked with `canShare({ files })` rather than by
 * sniffing the browser: the property exists in desktop Chrome too, where a
 * file share may still be refused, and the check is the only honest way to
 * ask. `navigator.share`/`canShare` are also secure-context-only — absent
 * entirely over a plain `http://` origin (a LAN dev server, for instance),
 * which is a second, unrelated reason this can fall through to a download.
 *
 * Two things a caller has to respect:
 *
 *  - It must be invoked from a user gesture. An `await` before it is fine on
 *    iOS *provided* the promise chain started in the handler, which is why the
 *    rendering above is awaited by the caller and not started here.
 *  - `AbortError` means someone dismissed the sheet. That is a completed
 *    interaction, not a failure, and must not fall through to a download —
 *    silently saving a file that was just cancelled is worse than doing nothing.
 */
export async function shareImage({
  blob,
  fileName,
  title,
  text,
  url,
}: ShareImageOptions): Promise<ShareImageResult> {
  const file = new File([blob], fileName, { type: blob.type || 'image/png' });

  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        ...(title ? { title } : {}),
        ...(text ? { text } : {}),
        ...(url ? { url } : {}),
      });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Anything else — a share already in progress, a platform that accepted
      // the `canShare` but refuses the payload — falls through to the download.
    }
  }

  return downloadImage(blob, fileName) ? 'downloaded' : 'failed';
}

/** Save the blob under `fileName`, via an object URL that is revoked straight after. */
export function downloadImage(blob: Blob, fileName: string): boolean {
  if (typeof document === 'undefined') return false;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);

  try {
    link.click();
  } catch {
    URL.revokeObjectURL(url);
    link.remove();
    return false;
  }

  link.remove();
  // Not revoked synchronously: Safari has to have started the download before
  // the URL goes away, and a frame is enough.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

/** Whether the OS sheet is available for images at all — decides the dialog's wording. */
export function canShareImages(): boolean {
  if (typeof navigator === 'undefined' || !navigator.canShare) return false;
  try {
    return navigator.canShare({
      files: [new File([new Blob([], { type: 'image/png' })], 'probe.png', { type: 'image/png' })],
    });
  } catch {
    return false;
  }
}
