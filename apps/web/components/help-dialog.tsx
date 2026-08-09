'use client';

import { getMessages } from '@vk/i18n';
import { Dialog } from '@vk/ui';
import { GuideSteps } from './guide-steps';

export type HelpDialogProps = {
  open: boolean;
  onClose: () => void;
};

const messages = getMessages();

/**
 * The full explanation of the flow's controls.
 *
 * Shared by the shell menu and the tutorial: since the tutorial screen itself
 * is now just the practice card, this is the *only* place the prose lives, and
 * two copies of it would be two things to keep in step.
 */
export function HelpDialog({ open, onClose }: HelpDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={messages.guide.title}
      closeLabel={messages.menu.close}
      size="wide"
    >
      <GuideSteps />
    </Dialog>
  );
}
