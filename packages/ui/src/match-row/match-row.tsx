'use client';

import { Avatar } from '../avatar/avatar';
import { partyColor } from '../party-color';
import { Tag } from '../tag/tag';
import styles from './match-row.module.css';

export type MatchRowProps = {
  /** 1-based position among candidates that could be compared. */
  rank?: number;
  name: string;
  avatarUrl?: string;
  /** The candidate's own accent colour — from data, or derived server-side from the logo. */
  color?: string;
  /** 0–100, or `undefined` for a candidate who never answered. */
  matchPercentage?: number;
  /** Pre-formatted, e.g. "74 %" — number formatting is locale work, so it happens above. */
  percentLabel?: string;
  /** Shown instead of a percentage, e.g. "Neodpověděli". */
  noAnswerLabel: string;
  /** The top match: larger, and captioned. */
  winner?: boolean;
  /** The winner's caption, e.g. "Největší shoda". */
  winnerLabel?: string;
  /** Whether this row's comparison is the one currently open. */
  selected?: boolean;
  onSelect: () => void;
  /** Seconds before the row rises into place. Ignored under reduced motion. */
  delay?: number;
};

/**
 * One candidate in the ranking.
 *
 * The percentage is drawn as a bar along the card's top edge rather than inside
 * it. Two reasons, and the second is the important one: it frees the card's
 * interior for whitespace, and — because every card in the column is the same
 * width — every bar is measured against the same scale. Sitting inside the
 * layout, the winner's bar shared a row with a larger avatar and a larger
 * number, so the widest match drew the *shortest* bar.
 *
 * Circles are spent on the avatar, where they identify rather than measure.
 *
 * A candidate who answered nothing gets no bar and no percentage: showing 0 %
 * would read as "opposed on everything" when the truth is "nothing to compare",
 * and that distinction is the difference between a fair result and a libel.
 */
export function MatchRow({
  rank,
  name,
  avatarUrl,
  color,
  matchPercentage,
  percentLabel,
  noAnswerLabel,
  winner = false,
  winnerLabel,
  selected = false,
  onSelect,
  delay = 0,
}: MatchRowProps) {
  const comparable = matchPercentage !== undefined;
  /*
   * `color` carries the data colour or the server-derived one when the
   * candidate has either; `partyColor` falls back to its seeded palette
   * otherwise, which is also what covers every party with no picture at all.
   */
  const accent = partyColor(name, color);

  return (
    <li
      className={`${styles.item} ${winner ? styles.winner : ''}`}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      <button
        type="button"
        className={styles.row}
        aria-pressed={selected}
        onClick={onSelect}
        disabled={!comparable}
        style={
          {
            '--row-accent': accent,
            '--avatar-wash': `oklch(from ${accent} l c h / 0.16)`,
            '--avatar-ring': `oklch(from ${accent} l c h / 0.6)`,
          } as React.CSSProperties
        }
      >
        {/* Decorative: the percentage is text a few pixels away, and a screen
            reader announcing the bar as well would read the same number twice. */}
        {comparable ? (
          <span className={styles.edge} aria-hidden="true">
            <span
              className={styles.edgeFill}
              style={{
                width: `${matchPercentage}%`,
                animationDelay: delay ? `${delay}s` : undefined,
              }}
            />
          </span>
        ) : null}

        <span className={styles.rank}>{rank ?? '–'}</span>

        <Avatar name={name} src={avatarUrl} size={winner ? 'large' : 'medium'} />

        <span className={styles.identity}>
          {winner && winnerLabel ? <Tag tone="neutral">{winnerLabel}</Tag> : null}
          <span className={styles.name}>{name}</span>
          {comparable ? null : <span className={styles.noAnswer}>{noAnswerLabel}</span>}
        </span>

        <span className={styles.percent}>{comparable ? percentLabel : null}</span>
      </button>
    </li>
  );
}
