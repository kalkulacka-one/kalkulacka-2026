'use client';

import { getMessages } from '@vk/i18n';
import { Dialog } from '@vk/ui';
import { GuideSteps, type PractisedGesture } from './guide-steps';

export type HelpDialogProps = {
  open: boolean;
  onClose: () => void;
  /**
   * Passed only from the tutorial, where a practice card sits behind this
   * dialog and its ticks are worth carrying through. From the shell menu, mid
   * flow, there is nothing to have practised.
   */
  practised?: ReadonlySet<PractisedGesture>;
};

const messages = getMessages();

/**
 * The full explanation of the flow's controls.
 *
 * Shared by the shell menu and the tutorial: since the tutorial screen itself
 * is now just the practice card, this is the *only* place the prose lives, and
 * two copies of it would be two things to keep in step.
 */
export function HelpDialog({ open, onClose, practised }: HelpDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={messages.guide.title}
      closeLabel={messages.menu.close}
      size="wide"
    >
      <GuideSteps practised={practised} />
    </Dialog>
  );
}
