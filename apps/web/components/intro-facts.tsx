import { getMessages } from '@vk/i18n';
import { TutorialStep } from '@vk/ui';
import styles from './intro-facts.module.css';

const messages = getMessages();

/**
 * What the calculator does with an answer, before anyone gives one.
 *
 * The split with `GuideSteps` is deliberate and is the whole reason the
 * onboarding is two screens rather than one: this list is about *consequences*
 * — a starred question counts double, a skipped one counts for nothing, and
 * nothing is final until the recap — while the tutorial's list is about
 * *operation*: which way to drag, which key to press. Someone deciding whether
 * to start needs the first; someone holding the card needs the second.
 *
 * So the rows here are the same three ideas the detailed guide ends its
 * descriptions with, lifted out and given the screen to themselves, with the
 * gesture clause that carried them dropped. Nothing here mentions a direction,
 * a key or a tap, which is what keeps it from being a tutorial the reader has
 * to sit through twice.
 *
 * Free of `usePointerKind` for exactly that reason — no gestures means no
 * finger-or-mouse wording, so this stays a plain server component.
 */
export function IntroFacts() {
  return (
    <ul className={styles.facts}>
      <TutorialStep
        icon="starThin"
        title={messages.intro.factImportantTitle}
        description={messages.intro.factImportantDescription}
      />
      <TutorialStep
        icon="neutral"
        title={messages.intro.factSkipTitle}
        description={messages.intro.factSkipDescription}
      />
      <TutorialStep
        icon="results"
        title={messages.intro.factRecapTitle}
        description={messages.intro.factRecapDescription}
      />
    </ul>
  );
}
