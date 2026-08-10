import type { ReactNode } from 'react';
import { Logo } from '../logo/logo';
import styles from './app-header.module.css';

export type AppHeaderProps = {
  /** The product name, next to the mark. */
  title: string;
  /** The election's display name, e.g. "Komunální volby 2022" — split into
   * type and year, with the type shown in the secondary color. */
  electionName?: string;
  /** The chosen region/district, shown between the election type and year. */
  calculatorName?: string;
  /**
   * Makes the brand block (mark + names) a link, opened in a new tab. Used by
   * embeds, where the wordmark doubles as the attribution — the one way from a
   * partner's iframe to the full site.
   */
  href?: string;
  /** Right-hand controls. In this app, the shell menu. */
  actions?: ReactNode;
};

/**
 * Splits "Komunální volby 2022" into type ("Komunální volby") and year
 * ("2022") so the two can be styled and ordered independently.
 */
function splitElectionName(electionName: string): { type: string; year?: string } {
  const match = electionName.match(/^(.+?)\s+(\d{4}.*)$/);
  if (!match?.[1] || !match[2]) return { type: electionName };
  return { type: match[1], year: match[2] };
}

/**
 * The bar at the top of every screen.
 *
 * Lifted out of the question flow, which is the one screen that already had a
 * header worth keeping, so that the rest of the app inherits it rather than
 * each screen inventing its own. Deliberately full-bleed: it frames the page
 * instead of sitting inside the content column, which is what makes the
 * scrolling screens and the fixed flow read as the same app.
 */
export function AppHeader({ title, electionName, calculatorName, href, actions }: AppHeaderProps) {
  const election = electionName ? splitElectionName(electionName) : undefined;

  const brandContent = (
    <>
      <Logo size={12} className={styles.logo} />
      <div className={styles.names}>
        <p className={styles.title}>{title}</p>
        {election ? (
          <p className={styles.subtitle}>
            <span className={styles.electionType}>{election.type}</span>
            {calculatorName ? <> {calculatorName}</> : null}
            {election.year ? <> {election.year}</> : null}
          </p>
        ) : null}
      </div>
    </>
  );

  return (
    <header className={styles.header}>
      {href ? (
        // A real anchor, not a router link: from inside an iframe this must
        // escape into a new tab, never navigate the embed itself away.
        <a className={styles.brand} href={href} target="_blank" rel="noreferrer">
          {brandContent}
        </a>
      ) : (
        <div className={styles.brand}>{brandContent}</div>
      )}

      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
