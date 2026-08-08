import { getMessages } from '@vk/i18n';
import { TutorialStep } from '@vk/ui';
import styles from './guide-steps.module.css';

const messages = getMessages();

/** The gestures the practice card can tick off. Rekapitulace is a screen. */
export type PractisedGesture = 'agree' | 'disagree' | 'important' | 'skip';

export type GuideStepsProps = {
  /**
   * Which gestures have been tried on the practice card, when there is one.
   * The help overlay renders the same list with no card above it and so passes
   * nothing — an unticked checklist there would imply homework.
   */
  practised?: ReadonlySet<PractisedGesture>;
};

/**
 * What the flow's controls mean.
 *
 * Lives on its own because it is needed in two places that must never drift
 * apart: the `/navod` screen before the first card, and the help overlay the
 * shell menu opens from anywhere. Same list, same order, one definition.
 */
export function GuideSteps({ practised }: GuideStepsProps) {
  const done = (gesture: PractisedGesture) => (practised ? practised.has(gesture) : undefined);

  return (
    <ul className={styles.steps}>
      <TutorialStep
        icon="arrowLeft"
        title={messages.guide.agreeTitle}
        description={messages.guide.agreeDescription}
        done={done('agree')}
        doneLabel={messages.guide.stepDone}
      />
      <TutorialStep
        icon="arrowRight"
        title={messages.guide.disagreeTitle}
        description={messages.guide.disagreeDescription}
        done={done('disagree')}
        doneLabel={messages.guide.stepDone}
      />
      <TutorialStep
        icon="starThin"
        title={messages.guide.importantTitle}
        description={messages.guide.importantDescription}
        done={done('important')}
        doneLabel={messages.guide.stepDone}
      />
      <TutorialStep
        icon="arrowDown"
        title={messages.guide.skipTitle}
        description={messages.guide.skipDescription}
        done={done('skip')}
        doneLabel={messages.guide.stepDone}
      />
      <TutorialStep
        icon="list"
        title={messages.guide.recapTitle}
        description={messages.guide.recapDescription}
      />
    </ul>
  );
}
