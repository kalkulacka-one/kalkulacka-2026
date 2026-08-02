import type { ReactNode } from 'react';
import { Avatar } from '../avatar/avatar';
import { Icon } from '../icon/icon';
import styles from './match-card.module.css';

export type MatchCardProps = {
  /** 1-based position in the ranking. Omitted for candidates that can't be ranked. */
  rank?: number;
  name: string;
  description?: string;
  avatarUrl?: string;
  /** 0–100, or `undefined` for a candidate who never answered. */
  matchPercentage?: number;
  /** Pre-formatted, e.g. "68 %" — number formatting is locale work, so it happens above. */
  percentLabel?: string;
  /** Shown instead of a percentage, e.g. "Neodpověděli". */
  noAnswerLabel: string;
  /** Accessible name for the disclosure, e.g. "Porovnat odpovědi". */
  toggleLabel: string;
  expanded?: boolean;
  onToggle?: () => void;
  /** The comparison, revealed by the disclosure. */
  children?: ReactNode;
};

/**
 * One candidate's result.
 *
 * A candidate who answered nothing gets no bar and no percentage — showing 0 %
 * would read as "opposed on everything" when the truth is "nothing to compare",
 * and that distinction is the difference between a fair result and a libel.
 */
export function MatchCard({
  rank,
  name,
  description,
  avatarUrl,
  matchPercentage,
  percentLabel,
  noAnswerLabel,
  toggleLabel,
  expanded = false,
  onToggle,
  children,
}: MatchCardProps) {
  const comparable = matchPercentage !== undefined;

  return (
    <li className={`${styles.card} ${comparable ? '' : styles.incomparable}`}>
      <div className={styles.head}>
        {rank !== undefined ? <span className={styles.rank}>{rank}</span> : null}

        <Avatar name={name} src={avatarUrl} />

        <div className={styles.identity}>
          <p className={styles.name}>{name}</p>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>

        <div className={styles.score}>
          {comparable ? (
            <span className={styles.percent}>{percentLabel}</span>
          ) : (
            <span className={styles.noAnswer}>{noAnswerLabel}</span>
          )}
        </div>
      </div>

      {/*
        Decorative: the percentage is already text a few lines up, so a screen
        reader announcing the bar as well would read the same number twice.
      */}
      {comparable ? (
        <div className={styles.track} aria-hidden="true">
          <div className={styles.fill} style={{ width: `${matchPercentage}%` }} />
        </div>
      ) : null}

      {onToggle ? (
        <>
          <button
            type="button"
            className={styles.toggle}
            aria-expanded={expanded}
            onClick={onToggle}
          >
            {toggleLabel}
            <Icon name={expanded ? 'chevronUpThin' : 'chevronDownThin'} size={16} />
          </button>

          {expanded ? <div className={styles.panel}>{children}</div> : null}
        </>
      ) : null}
    </li>
  );
}
