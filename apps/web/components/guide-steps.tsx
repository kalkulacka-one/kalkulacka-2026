'use client';

import { getMessages } from '@vk/i18n';
import { TutorialStep } from '@vk/ui';
import { usePointerKind } from '../lib/use-pointer-kind';
import styles from './guide-steps.module.css';

const messages = getMessages();

/** The gestures the practice card can tick off. Rekapitulace is a screen. */
export type PractisedGesture = 'agree' | 'disagree' | 'important' | 'skip';

/**
 * What the flow's controls mean.
 *
 * Lives on its own because it is needed in two places that must never drift
 * apart: the "Podrobný návod" overlay on `/navod`, and the same overlay opened
 * from the shell menu anywhere in the flow. Same list, same order, one
 * definition.
 *
 * It says nothing about what the reader has already tried. It used to tick off
 * the gestures practised on the card behind it, which turned reference prose
 * into a scoreboard — and a scoreboard is precisely wrong for the surface
 * someone opens *because they are stuck*, where a row marked "Vyzkoušeno" is
 * the row they came to re-read. Discovery is shown where it is happening, on
 * the card's own arrows.
 *
 * The wording follows the pointer: a finger is told to drag and tap, a mouse is
 * told about the keys and to click.
 */
export function GuideSteps() {
  const pointer = usePointerKind();
  const touch = pointer === 'touch';

  return (
    <ul className={styles.steps}>
      <TutorialStep
        icon="arrowLeft"
        title={messages.guide.agreeTitle}
        description={
          touch ? messages.guide.agreeDescriptionTouch : messages.guide.agreeDescriptionPointer
        }
      />
      <TutorialStep
        icon="arrowRight"
        title={messages.guide.disagreeTitle}
        description={
          touch
            ? messages.guide.disagreeDescriptionTouch
            : messages.guide.disagreeDescriptionPointer
        }
      />
      <TutorialStep
        icon="starThin"
        title={messages.guide.importantTitle}
        description={
          touch
            ? messages.guide.importantDescriptionTouch
            : messages.guide.importantDescriptionPointer
        }
      />
      <TutorialStep
        icon="arrowDown"
        title={messages.guide.skipTitle}
        description={
          touch ? messages.guide.skipDescriptionTouch : messages.guide.skipDescriptionPointer
        }
      />
      <TutorialStep
        icon="results"
        title={messages.guide.recapTitle}
        description={messages.guide.recapDescription}
      />
    </ul>
  );
}
