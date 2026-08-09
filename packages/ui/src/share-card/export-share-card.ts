import {
  CARD_SIZES,
  type CardFormat,
  paintShareCard,
  type ShareCardContent,
} from './paint-share-card';
import { type CardTheme, cardPalette } from './palette';
import { readThemeColors, readThemeFonts } from './read-theme-colors';

export type RenderShareCardOptions = {
  content: ShareCardContent;
  theme: CardTheme;
  format: CardFormat;
};

/**
 * The card at export size, as a PNG blob.
 *
 * Everything happens in the tab: a detached canvas, `toBlob`, and a `File`
 * handed to the system. Nothing is uploaded, nothing is stored, and there is no
 * image endpoint to run — which also means the picture cannot outlive the
 * moment someone chose to share it.
 */
export async function renderShareCard({
  content,
  theme,
  format,
}: RenderShareCardOptions): Promise<Blob | null> {
  const { width, height } = CARD_SIZES[format];
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // The same wait the preview makes: a canvas asked for a font that has not
  // arrived draws in a system face without complaining.
  if (document.fonts?.ready) await document.fonts.ready.catch(() => undefined);

  paintShareCard(ctx, {
    content,
    palette: cardPalette(theme, readThemeColors(theme === 'light' ? 'light' : 'dark')),
    format,
    fonts: readThemeFonts(),
  });

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
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
 * going without this app knowing about any of those destinations. Support is
 * checked with `canShare({ files })` rather than by sniffing the browser: the
 * property exists in desktop Chrome too, where a file share may still be
 * refused, and the check is the only honest way to ask.
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
