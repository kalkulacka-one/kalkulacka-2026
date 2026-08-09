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
import { trackEvent } from '../lib/analytics';
import { copyText } from '../lib/clipboard';
import { requestShareLink } from '../lib/session-sync';
import styles from './share-dialog.module.css';

/**
 * What it takes to turn this result into a link somebody else can open.
 *
 * Absent when there is no backend to mint one — a fork that configured none
 * gets exactly the dialog it had before public links existed, image and all,
 * with no dead button explaining what it cannot do.
 */
export type ShareLinkTarget = {
  calculatorId: string;
  /** The public result's path, once the server has said what its id is. */
  resultPath: (publicId: string) => string;
};

export type ShareDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Everything printed on the card, already localized and formatted. */
  content: ShareCardContent;
  /** Slugged into the downloaded file's name. */
  fileName: string;
  /** Offered to the OS share sheet as the shared link, alongside the image. */
  url: string;
  link?: ShareLinkTarget;
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
 * The link's own progress, kept apart from the image's.
 *
 * Two actions that can each be mid-flight, and each fail for its own reason —
 * one state for both would let a failed mint clear a successful save's
 * message, or disable the button that had nothing to do with it.
 */
type LinkStatus = 'idle' | 'working' | 'copied' | 'failed';

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
export function ShareDialog({ open, onClose, content, fileName, url, link }: ShareDialogProps) {
  const [theme, setTheme] = useState<CardTheme>('light');
  const [cardFormat, setCardFormat] = useState<CardFormat>('story');
  const [status, setStatus] = useState<Status>('idle');
  const [linkStatus, setLinkStatus] = useState<LinkStatus>('idle');
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
    if (!open) {
      setStatus('idle');
      setLinkStatus('idle');
    }
  }, [open]);

  useEffect(() => {
    if (status === 'idle' || status === 'working') return;
    const timer = window.setTimeout(() => setStatus('idle'), status === 'failed' ? 6000 : 2400);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (linkStatus === 'idle' || linkStatus === 'working') return;
    const timer = window.setTimeout(
      () => setLinkStatus('idle'),
      linkStatus === 'failed' ? 6000 : 2400,
    );
    return () => window.clearTimeout(timer);
  }, [linkStatus]);

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

      // Both the OS share sheet and the direct-download fallback are a
      // completed hand-off of the image — a cancelled sheet or a failed
      // export is not.
      if (result === 'shared' || result === 'downloaded') {
        trackEvent('Result shared', { method: 'image' });
      }
    } catch {
      setStatus('failed');
    }
  }, [content, theme, cardFormat, exportName, url]);

  /**
   * Turn the result into an address, and put it on the clipboard.
   *
   * Two steps that can each fail, reported as one outcome because the reader
   * asked for one thing: minting the public id server-side, then copying —
   * through `copyText`, which is the path that still works on a phone without
   * a secure context, where `navigator.clipboard` does not exist at all.
   */
  const onCopyLink = useCallback(async () => {
    if (!link) return;
    setLinkStatus('working');

    const publicId = await requestShareLink(link.calculatorId);
    if (!publicId) {
      setLinkStatus('failed');
      return;
    }

    // The origin comes from the page, not from configuration: this has to be
    // the address the reader is actually on — staging, a preview deployment,
    // an embed's host — and not whatever a build-time base URL said.
    const publicUrl = new URL(link.resultPath(publicId), window.location.origin).toString();
    const copied = await copyText(publicUrl);
    setLinkStatus(copied ? 'copied' : 'failed');
    if (copied) trackEvent('Result shared', { method: 'link' });
  }, [link]);

  /*
   * One line for both actions. They cannot be mid-flight and finished at the
   * same time in any way worth reporting twice, and the link's outcome wins
   * because it is the more recent press whenever both have one.
   */
  const statusText =
    linkStatus === 'copied'
      ? share.linkCopied
      : linkStatus === 'failed'
        ? share.linkFailed
        : status === 'saved'
          ? share.saved
          : status === 'failed'
            ? share.failed
            : '';

  const failed = status === 'failed' || linkStatus === 'failed';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={share.title}
      closeLabel={share.close}
      size="wide"
      actions={
        <>
          {/*
            Second, and quieter: the picture is what this dialog is for. The
            link is the thing you reach for when you want somebody to see the
            whole result rather than the top five.
          */}
          {link ? (
            <Button
              variant="outline"
              onClick={onCopyLink}
              iconStart="link"
              disabled={linkStatus === 'working'}
            >
              {linkStatus === 'working' ? share.copyingLink : share.copyLink}
            </Button>
          ) : null}

          <Button
            onClick={onShare}
            iconStart={canShare === false ? 'download' : 'share'}
            disabled={status === 'working'}
            fullWidth={!link}
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
        <p className={styles.status} role="status" data-failed={failed ? '' : undefined}>
          {statusText}
        </p>
      </div>
    </Dialog>
  );
}
