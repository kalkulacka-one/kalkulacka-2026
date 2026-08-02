'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { IconButton } from '../icon-button/icon-button';
import styles from './dialog.module.css';

export type DialogProps = {
  open: boolean;
  /** Called for every dismissal — the close button, Escape, or the backdrop. */
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  /** Buttons for the bottom row. Put the confirming action last. */
  actions?: ReactNode;
  closeLabel: string;
  /** `wide` is for reading content (the help sheet); `compact` for a question. */
  size?: 'compact' | 'wide';
};

/**
 * A modal, on the platform's own `<dialog>`.
 *
 * Using `showModal()` rather than a hand-built overlay means focus trapping,
 * Escape, `aria-modal`, inertness of the page behind, and the top layer (so no
 * z-index in this codebase can ever paint over it) are the browser's job. What
 * is left here is the styling and turning the native `close` event back into
 * the `open` prop's owner being told.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  closeLabel,
  size = 'compact',
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    // `open` is the source of truth; the element is told to match it. Guarding
    // on the element's own state keeps `showModal()` from throwing when it is
    // already modal (React may re-run this after an unrelated prop change).
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    // Covers anything that closes the element without going through `onClose`
    // — `dialog.close()` called from elsewhere, or a browser that dismisses it
    // on its own. Telling the owner unconditionally is safe: it only ever sets
    // `open` to the value it already has when we were the ones who closed it.
    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${styles[size]}`}
      aria-labelledby={`${styles.title}-heading`}
      /*
       * The backdrop is part of the dialog's own box, so a click landing on the
       * element itself — rather than on the panel inside it — is a click
       * outside the content.
       */
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      /*
       * Escape is routed through React rather than left to the element.
       *
       * A modal `<dialog>` does dismiss itself on Escape, but that path only
       * reports back via the `close` event — and if that event does not arrive,
       * the element is shut while `open` still says true, so the same dialog can
       * never be opened again. Handling the key here makes the state the thing
       * that closes it, which is the same route every other dismissal takes.
       * `preventDefault` stops the native dismissal from racing it; the effect
       * above then closes the element for real.
       */
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        onClose();
      }}
    >
      <div className={styles.panel}>
        <div className={styles.head}>
          <div className={styles.heading}>
            <h2 id={`${styles.title}-heading`} className={styles.title}>
              {title}
            </h2>
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>

          <IconButton icon="close" label={closeLabel} onClick={onClose} />
        </div>

        {children ? <div className={styles.body}>{children}</div> : null}
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </dialog>
  );
}
