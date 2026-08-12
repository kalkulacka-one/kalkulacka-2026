'use client';

import { getMessages } from '@vk/i18n';
import {
  Button,
  type CardFormat,
  type CardTheme,
  canShareImages,
  cardSwatches,
  copyShareCardImage,
  Dialog,
  downloadImage,
  renderShareCard,
  ShareCard,
  type ShareCardContent,
  shareImage,
  VisuallyHidden,
} from '@vk/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { trackEvent } from '../lib/analytics';
import { copyText } from '../lib/clipboard';
import { type CalculatorRef, shareIntroUrl } from '../lib/paths';
import { requestShareLink } from '../lib/session-sync';
import { chooseShareMode } from '../lib/share-mode';
import { usePointerKind } from '../lib/use-pointer-kind';
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
  /** The embed partner, when minting from inside an iframe — routes the mint
   * through the embed's own session rather than the first-party one. */
  embedName?: string;
};

export type ShareDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Everything printed on the card, already localized and formatted. */
  content: ShareCardContent;
  /** Slugged into the downloaded file's name. */
  fileName: string;
  /** What `shareIntroUrl` needs to build the address offered alongside the OS sheet. */
  calculatorRef: CalculatorRef;
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

/**
 * Every outcome any of the three image actions (sheet-share, copy, download)
 * can leave behind. One field for all three rather than one per action: only
 * one of them is ever mid-flight at a time (see the `disabled` props below),
 * so there is never a moment where two genuinely different outcomes need
 * showing at once.
 */
type Status = 'idle' | 'working' | 'saved' | 'copied' | 'copyFailedSaved' | 'failed';

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
 * Two different UIs, chosen by pointer kind (`chooseShareMode`) rather than
 * by feature-sniffing alone:
 *
 *  - On a touch device that can share files, the OS sheet is the single
 *    action — Messages, Instagram, AirDrop, Photos are all destinations this
 *    app has no business knowing about, and the sheet's own "Save Image"
 *    entry already covers saving, so there is no separate save action beside
 *    it. The address handed to the sheet alongside the picture is the
 *    calculator's *intro*, not this results page — a recipient opening this
 *    page's own URL would see the sender's ranking, not a blank calculator
 *    waiting for their own answers.
 *  - On a fine pointer, the sheet is never offered at all, even where
 *    `navigator.share` claims to support files: macOS Safari answers that
 *    claim honestly and then opens a sheet whose own "Copy" entry pastes the
 *    exported PNG's *temp-file path* as text into whatever the reader pasted
 *    into, not the image. Desktop gets two plain actions instead — copy the
 *    image to the clipboard, or download it — neither of which routes
 *    through that sheet.
 */
export function ShareDialog({
  open,
  onClose,
  content,
  fileName,
  calculatorRef,
  link,
}: ShareDialogProps) {
  const [theme, setTheme] = useState<CardTheme>('light');
  const [cardFormat, setCardFormat] = useState<CardFormat>('story');
  const [status, setStatus] = useState<Status>('idle');
  const [linkStatus, setLinkStatus] = useState<LinkStatus>('idle');
  const pointerKind = usePointerKind();
  /*
   * Resolved on the client, after mount: `navigator.canShare` is absent during
   * the server render, and deciding the dialog's layout from that would ship
   * one shape into the HTML and then swap it on hydration. `null` until known
   * — `usePointerKind` starts at its own hydration-safe default ('touch') for
   * the same reason, so the pair agrees with the server on every render up to
   * the point the effects below correct them, and `mode` below falls back to
   * the sheet layout for that one frame, which is what the app already showed
   * before this dialog could tell touch and mouse apart.
   */
  const [canShareFiles, setCanShareFiles] = useState<boolean | null>(null);
  /** Sampled once the dialog is up: reading them needs the themed DOM. */
  const [swatches, setSwatches] = useState<Record<CardTheme, string> | null>(null);

  useEffect(() => setCanShareFiles(canShareImages()), []);

  useEffect(() => {
    if (open) setSwatches(cardSwatches());
  }, [open]);

  const mode = canShareFiles === null ? 'sheet' : chooseShareMode(pointerKind, canShareFiles);

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
    const isError = status === 'failed' || status === 'copyFailedSaved';
    const timer = window.setTimeout(() => setStatus('idle'), isError ? 6000 : 2400);
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
        // The intro, not `window.location.href`: a recipient who opens this
        // page's own address would render the sender's result, not a blank
        // calculator waiting for their own answers.
        url: shareIntroUrl(window.location.origin, calculatorRef),
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
  }, [content, theme, cardFormat, exportName, calculatorRef]);

  /**
   * Copy the card straight onto the clipboard, as a PNG.
   *
   * The gesture-timing constraint that makes this work in Safari lives in
   * `copyShareCardImage` itself (see its own comment) — this callback's only
   * job is to stay out of that function's way, which is why it does not
   * `await` anything before calling it.
   */
  const onCopyImage = useCallback(() => {
    setStatus('working');
    copyShareCardImage({ content, theme, format: cardFormat, fileName: exportName })
      .then((result) => {
        setStatus(
          result === 'copied' ? 'copied' : result === 'downloaded' ? 'copyFailedSaved' : 'failed',
        );
        if (result !== 'failed') {
          trackEvent('Result shared', { method: result === 'copied' ? 'image-copy' : 'image' });
        }
      })
      .catch(() => setStatus('failed'));
  }, [content, theme, cardFormat, exportName]);

  const onDownload = useCallback(async () => {
    setStatus('working');
    try {
      const blob = await renderShareCard({ content, theme, format: cardFormat });
      const ok = blob ? downloadImage(blob, exportName) : false;
      setStatus(ok ? 'saved' : 'failed');
      if (ok) trackEvent('Result shared', { method: 'image-download' });
    } catch {
      setStatus('failed');
    }
  }, [content, theme, cardFormat, exportName]);

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

    const publicId = await requestShareLink(link.calculatorId, link.embedName);
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
   * One line for every action. They cannot be mid-flight and finished at the
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
          : status === 'copied'
            ? share.imageCopied
            : status === 'copyFailedSaved'
              ? share.imageCopyFailedSaved
              : status === 'failed'
                ? share.failed
                : '';

  const failed = status === 'failed' || status === 'copyFailedSaved' || linkStatus === 'failed';
  const imageBusy = status === 'working';

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
            First, and quieter: the picture is what this dialog is for. The
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

          {mode === 'sheet' ? (
            <Button onClick={onShare} iconStart="share" disabled={imageBusy} fullWidth={!link}>
              {imageBusy ? share.working : share.shareImage}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={onDownload}
                iconStart="download"
                disabled={imageBusy}
              >
                {imageBusy ? share.working : share.download}
              </Button>
              <Button onClick={onCopyImage} iconStart="copy" disabled={imageBusy}>
                {imageBusy ? share.working : share.copyImage}
              </Button>
            </>
          )}
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
