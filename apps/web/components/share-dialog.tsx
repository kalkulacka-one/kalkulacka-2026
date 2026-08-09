'use client';

import { format as formatMessage, getMessages } from '@vk/i18n';
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
} from '@vk/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { copyText } from '../lib/clipboard';
import styles from './share-dialog.module.css';

export type ShareDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Everything printed on the card, already localized and formatted. */
  content: ShareCardContent;
  /** Slugged into the downloaded file's name. */
  fileName: string;
  /** Offered alongside the image, and copied by the link button. */
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

type Status = 'idle' | 'working' | 'saved' | 'copied' | 'failed';

/**
 * Turn the result into a picture someone can post.
 *
 * The whole thing runs in the tab. The card is painted onto a canvas at export
 * size, handed to `navigator.share` as a `File`, and dropped — so the phone's
 * own sheet decides where it goes (Stories, Messages, Photos, AirDrop) and this
 * app never has an image to store, serve, or forget to delete. Where that API
 * is missing — every desktop browser but Chrome, and any http:// origin — the
 * same blob is saved instead, and the button says so rather than pretending.
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

      const result = await shareImage({
        blob,
        fileName: exportName,
        title: content.title,
        ...(content.subtitle ? { text: content.subtitle } : {}),
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

  const onCopyLink = useCallback(async () => {
    setStatus((await copyText(url)) ? 'copied' : 'failed');
  }, [url]);

  const statusText =
    status === 'saved'
      ? share.saved
      : status === 'copied'
        ? share.copiedLink
        : status === 'failed'
          ? share.failed
          : '';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={share.title}
      description={share.description}
      closeLabel={share.close}
      size="wide"
      actions={
        <>
          <Button variant="ghost" onClick={onCopyLink} iconStart="link">
            {status === 'copied' ? share.copiedLink : share.copyLink}
          </Button>
          <Button
            onClick={onShare}
            iconStart={canShare === false ? 'download' : 'share'}
            disabled={status === 'working'}
          >
            {status === 'working'
              ? share.working
              : canShare === false
                ? share.saveImage
                : share.shareImage}
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <div className={styles.preview} data-format={cardFormat}>
          <ShareCard
            content={content}
            theme={theme}
            format={cardFormat}
            size={280}
            label={share.preview}
          />
        </div>

        <fieldset className={styles.group}>
          <legend className={styles.legend}>{share.themeLabel}</legend>
          <div className={styles.swatches}>
            {THEMES.map((option) => (
              <button
                key={option.id}
                type="button"
                className={styles.swatch}
                aria-pressed={theme === option.id}
                onClick={() => setTheme(option.id)}
              >
                <span
                  className={styles.swatchChip}
                  style={swatches ? { background: swatches[option.id] } : undefined}
                  aria-hidden="true"
                />
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.group}>
          <legend className={styles.legend}>{share.formatLabel}</legend>
          <div className={styles.formats}>
            {FORMATS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={styles.format}
                aria-pressed={cardFormat === option.id}
                onClick={() => setCardFormat(option.id)}
              >
                <span className={styles.formatShape} data-shape={option.id} aria-hidden="true" />
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/*
          One live region for every outcome, kept in the DOM whether or not it
          has anything in it — a `role="status"` that is added at the same
          moment as its text is not reliably announced.
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

/** The note printed on the card: how much of the calculator was answered. */
export function shareNote(answered: number, total: number): string {
  return formatMessage(share.note, { answered, total });
}
