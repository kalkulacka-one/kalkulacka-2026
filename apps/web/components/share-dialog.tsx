'use client';

import { getMessages } from '@vk/i18n';
import {
  Button,
  type CardFormat,
  type CardTheme,
  canShareImages,
  cardSwatches,
  Dialog,
  renderShareCard,
  ShareCard,
  type ShareCardContent,
  shareImage,
  VisuallyHidden,
} from '@vk/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './share-dialog.module.css';

export type ShareDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Everything printed on the card, already localized and formatted. */
  content: ShareCardContent;
  /** Slugged into the downloaded file's name. */
  fileName: string;
  /** Offered to the OS share sheet as the shared link, alongside the image. */
  url: string;
};

const messages = getMessages();
const share = messages.results.shareDialog;

const THEMES: readonly { id: CardTheme; label: string }[] = [
  { id: 'light', label: share.themeLight },
  { id: 'dark', label: share.themeDark },
  { id: 'agree', label: share.themeAgree },
  { id: 'disagree', label: share.themeDisagree },
];

const FORMATS: readonly { id: CardFormat; label: string }[] = [
  { id: 'story', label: share.formatStory },
  { id: 'landscape', label: share.formatLandscape },
];

type Status = 'idle' | 'working' | 'saved' | 'failed';

/**
 * Turn the result into a picture someone can post.
 *
 * The whole thing runs in the tab. The card is rendered off-screen at export
 * size and rasterised, then handed to `navigator.share` as a `File` — so the
 * phone's own sheet decides where it goes (Stories, Messages, Photos,
 * AirDrop) and this app never has an image to store, serve, or forget to
 * delete. That same sheet's own "Save Image" entry is what covers saving on a
 * phone; there is no separate save action to offer alongside it. Only where
 * the sheet itself is unavailable — every desktop browser but Chrome, and any
 * `http://` origin — does the button fall back to a download, and it says so
 * rather than pretending.
 */
export function ShareDialog({ open, onClose, content, fileName, url }: ShareDialogProps) {
  const [theme, setTheme] = useState<CardTheme>('light');
  const [cardFormat, setCardFormat] = useState<CardFormat>('story');
  const [status, setStatus] = useState<Status>('idle');
  /*
   * Resolved on the client, after mount: `navigator.canShare` is absent during
   * the server render, and deciding the button's label from that would ship
   * "Uložit obrázek" into the HTML and then swap it on hydration. `null` until
   * known, which is the one frame the button spends without a label decision.
   */
  const [canShare, setCanShare] = useState<boolean | null>(null);
  /** Sampled once the dialog is up: reading them needs the themed DOM. */
  const [swatches, setSwatches] = useState<Record<CardTheme, string> | null>(null);

  useEffect(() => setCanShare(canShareImages()), []);

  useEffect(() => {
    if (open) setSwatches(cardSwatches());
  }, [open]);

  // Clearing on close as well as on a timer: reopening the dialog should not
  // still be showing the outcome of the last visit.
  useEffect(() => {
    if (!open) setStatus('idle');
  }, [open]);

  useEffect(() => {
    if (status === 'idle' || status === 'working') return;
    const timer = window.setTimeout(() => setStatus('idle'), status === 'failed' ? 6000 : 2400);
    return () => window.clearTimeout(timer);
  }, [status]);

  const exportName = useMemo(
    () => `${fileName}-${cardFormat}-${theme}.png`,
    [fileName, cardFormat, theme],
  );

  const onShare = useCallback(async () => {
    setStatus('working');
    try {
      const blob = await renderShareCard({ content, theme, format: cardFormat });
      if (!blob) {
        setStatus('failed');
        return;
      }

      // The sheet's own caption, where the platform offers one — the card's
      // headline and which calculator it came from, joined here rather than
      // held on `content` (which keeps them apart so the lockup can weight
      // them separately).
      const caption = [content.title, content.electionName, content.calculatorName]
        .filter(Boolean)
        .join(' · ');

      const result = await shareImage({
        blob,
        fileName: exportName,
        title: content.title,
        text: caption,
        url,
      });

      // A dismissed share sheet is a finished interaction, not a failure —
      // nothing to report, and nothing to undo.
      if (result === 'cancelled' || result === 'shared') setStatus('idle');
      else setStatus(result === 'downloaded' ? 'saved' : 'failed');
    } catch {
      setStatus('failed');
    }
  }, [content, theme, cardFormat, exportName, url]);

  const statusText = status === 'saved' ? share.saved : status === 'failed' ? share.failed : '';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={share.title}
      closeLabel={share.close}
      size="wide"
      actions={
        <Button
          onClick={onShare}
          iconStart={canShare === false ? 'download' : 'share'}
          disabled={status === 'working'}
          fullWidth
        >
          {status === 'working'
            ? share.working
            : canShare === false
              ? share.saveImage
              : share.shareImage}
        </Button>
      }
    >
      <div className={styles.body}>
        <div className={styles.preview} data-format={cardFormat}>
          <ShareCard
            content={content}
            theme={theme}
            format={cardFormat}
            size={cardFormat === 'story' ? 172 : 260}
            label={share.preview}
          />
        </div>

        {/*
          One row: four theme circles, then the two format toggles — labels
          live in `aria-label`/a hidden legend instead of on-screen text, which
          is what keeps this compact enough to leave the share button above the
          fold on a phone.
        */}
        <div className={styles.controls}>
          <fieldset className={styles.group}>
            <legend>
              <VisuallyHidden>{share.themeLabel}</VisuallyHidden>
            </legend>
            <div className={styles.swatches}>
              {THEMES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={styles.swatch}
                  aria-pressed={theme === option.id}
                  aria-label={option.label}
                  title={option.label}
                  onClick={() => setTheme(option.id)}
                  style={swatches ? { background: swatches[option.id] } : undefined}
                />
              ))}
            </div>
          </fieldset>

          <div className={styles.divider} aria-hidden="true" />

          <fieldset className={styles.group}>
            <legend>
              <VisuallyHidden>{share.formatLabel}</VisuallyHidden>
            </legend>
            <div className={styles.formats}>
              {FORMATS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={styles.format}
                  aria-pressed={cardFormat === option.id}
                  aria-label={option.label}
                  title={option.label}
                  onClick={() => setCardFormat(option.id)}
                >
                  <span className={styles.formatShape} data-shape={option.id} aria-hidden="true" />
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {/*
          Always in the DOM so assistive tech is already watching it, and
          holding its line of space so the button above doesn't jump when a
          message arrives.
        */}
        <p
          className={styles.status}
          role="status"
          data-failed={status === 'failed' ? '' : undefined}
        >
          {statusText}
        </p>
      </div>
    </Dialog>
  );
}
