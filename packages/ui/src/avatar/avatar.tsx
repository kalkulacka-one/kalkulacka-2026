import styles from './avatar.module.css';

export type AvatarProps = {
  /** Full name — used for the initials fallback and as the image's alt text. */
  name: string;
  src?: string;
  size?: 'small' | 'medium' | 'large';
};

/**
 * Take at most two initials, skipping the punctuation that party names are full
 * of ("ANO 2011" -> "A2", "Piráti a Starostové" -> "PS").
 */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * A candidate's picture, with initials behind it.
 *
 * The initials are rendered as a sibling rather than swapped in on error: an
 * archive logo that 404s should degrade to something readable without a state
 * update, and a transparent logo sitting over its own initials looks wrong. So
 * the image covers them opaquely when it loads and reveals them when it does
 * not — no JavaScript involved.
 */
export function Avatar({ name, src, size = 'medium' }: AvatarProps) {
  return (
    <span className={`${styles.avatar} ${styles[size]}`}>
      <span className={styles.initials} aria-hidden="true">
        {initialsOf(name)}
      </span>
      {src ? <img className={styles.image} src={src} alt="" loading="lazy" /> : null}
    </span>
  );
}
