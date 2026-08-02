import { getMessages } from '@vk/i18n';
import { TutorialStep } from '@vk/ui';
import styles from './guide-steps.module.css';

const messages = getMessages();

/**
 * What the flow's controls mean.
 *
 * Lives on its own because it is needed in two places that must never drift
 * apart: the `/navod` screen before the first card, and the help overlay the
 * shell menu opens from anywhere. Same list, same order, one definition.
 */
export function GuideSteps() {
  return (
    <ul className={styles.steps}>
      <TutorialStep
        icon="arrowLeft"
        title={messages.guide.agreeTitle}
        description={messages.guide.agreeDescription}
      />
      <TutorialStep
        icon="arrowRight"
        title={messages.guide.disagreeTitle}
        description={messages.guide.disagreeDescription}
      />
      <TutorialStep
        icon="starThin"
        title={messages.guide.importantTitle}
        description={messages.guide.importantDescription}
      />
      <TutorialStep
        icon="arrowDown"
        title={messages.guide.skipTitle}
        description={messages.guide.skipDescription}
      />
      <TutorialStep
        icon="list"
        title={messages.guide.recapTitle}
        description={messages.guide.recapDescription}
      />
    </ul>
  );
}
