import { Button } from '@vk/ui';
import Link from 'next/link';
import styles from './back-link.module.css';

export type BackLinkProps = {
  href: string;
  label: string;
};

/**
 * The way back, on every screen that has one.
 *
 * A `Button` in the `plate` variant rather than its own styled anchor: it sits
 * beside the share action and under the shell's menu trigger, and all three are
 * the same kind of thing — chrome floating over a moving backdrop. It had been
 * forty lines of near-identical CSS copied into two screens' modules, which had
 * already started to drift; now the appearance lives in one variant and the
 * three controls cannot disagree.
 *
 * Still a real anchor underneath (`as={Link}`), so it can be opened in a new tab
 * and reads as a link to assistive tech.
 */
export function BackLink({ href, label }: BackLinkProps) {
  return (
    <span className={styles.back}>
      <Button as={Link} href={href} variant="plate" size="small" iconStart="chevronLeftThin">
        {label}
      </Button>
    </span>
  );
}
