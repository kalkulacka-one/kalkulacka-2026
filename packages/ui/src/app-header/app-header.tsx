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
export function AppHeader({ title, electionName, calculatorName, actions }: AppHeaderProps) {
  const election = electionName ? splitElectionName(electionName) : undefined;

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
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
      </div>

      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
