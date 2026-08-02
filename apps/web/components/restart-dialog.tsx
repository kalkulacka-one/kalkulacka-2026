'use client';

import { getMessages } from '@vk/i18n';
import { Button, Dialog } from '@vk/ui';

export type RestartDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const messages = getMessages();

/**
 * "Are you sure?" for the one action in the app that destroys work.
 *
 * Shared rather than written at each call site because there are two ways to
 * reach it — the shell menu and the calculator's front door — and a
 * confirmation that words the consequence differently depending on which
 * button you came from is a confirmation nobody can trust.
 */
export function RestartDialog({ open, onClose, onConfirm }: RestartDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={messages.menu.restartTitle}
      description={messages.menu.restartDescription}
      closeLabel={messages.menu.close}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            {messages.menu.cancel}
          </Button>
          <Button onClick={onConfirm}>{messages.menu.restartConfirm}</Button>
        </>
      }
    />
  );
}
