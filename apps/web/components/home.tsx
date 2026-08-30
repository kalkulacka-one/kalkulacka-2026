import type { DistrictKind } from '@vk/core';
import { districtVocabulary, getMessages, plural } from '@vk/i18n';
import { Button, Icon, Logo, Tag, TutorialStep } from '@vk/ui';
import Link from 'next/link';
import { SITE_ORGANIZATION } from '../config/site';
import { AppShell } from './app-shell';
import styles from './home.module.css';

export type HomeElection = {
  key: string;
  name: string;
  description?: string;
  /** How many calculators in it are ready — rendered in that kind's own noun. */
  count: string;
  /** The picker, or straight into the calculator when it is the only one. */
  href: string;
};

export type HomeProps = {
  /**
   * Every election with something behind it, current first. Can be empty on a
   * fork that has configured no elections yet — the hero then simply has no
   * call to action rather than a button that 404s.
   */
  elections: HomeElection[];
};

const messages = getMessages();

/**
 * The front door.
 *
 * Built on `AppShell` rather than `Screen` — `Screen` owns the h1, caps the
 * column at 42rem and reserves the bottom for a `StickyBar`, all three of which
 * are the right calls for a step inside a calculator and none of which this
 * page wants: the headline sits under a brand mark, the three-step strip and
 * the footer want a wider column, and the primary action belongs *in* the hero,
 * where it is the first thing on the page, not pinned to the bottom of it.
 *
 * A server component throughout. Nothing here is interactive except links and
 * the shell's own menu, so none of it needs to reach the client.
 */
export function Home({ elections }: HomeProps) {
  // The election the site is currently *about*. Everything else is a list.
  const current = elections[0];

  return (
    <AppShell scroll="document">
      {/* One box around both, because on a desktop it is the scroller — see
          `.page` in the stylesheet. */}
      <div className={styles.page}>
        <main className={styles.main}>
          <div className={styles.inner}>
            <section className={styles.hero}>
              {/* Decorative: the header's wordmark already names the product, and
                the h1 underneath says what it does. */}
              <Logo size={28} className={styles.heroMark} />

              <div className={styles.heroText}>
                {current ? <Tag>{current.name}</Tag> : null}
                <h1 className={styles.heroTitle}>{messages.home.heroTitle}</h1>
                <p className={styles.heroLead}>{messages.home.heroLead}</p>
              </div>

              {current ? (
                <Button as={Link} href={current.href} size="large" iconEnd="chevronRightThin">
                  {messages.home.heroCta}
                </Button>
              ) : null}
            </section>

            {elections.length > 0 ? (
              <section className={styles.section} aria-labelledby="home-elections">
                <h2 id="home-elections" className={styles.sectionHeading}>
                  {messages.home.electionsTitle}
                </h2>

                {/*
                A list, and a grid once there is room for two across — today it
                holds one card, but the shape it has to grow into is several
                current elections plus an archive group below them.
              */}
                <ul className={styles.electionList}>
                  {elections.map((election) => (
                    <li key={election.key}>
                      <Link href={election.href} className={styles.electionCard}>
                        <span className={styles.electionText}>
                          <span className={styles.electionCount}>{election.count}</span>
                          <span className={styles.electionName}>{election.name}</span>
                          {election.description ? (
                            <span className={styles.electionDescription}>
                              {election.description}
                            </span>
                          ) : null}
                        </span>

                        <Icon
                          name="chevronRightThin"
                          size={20}
                          className={styles.electionChevron}
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className={styles.section} aria-labelledby="home-how">
              <h2 id="home-how" className={styles.sectionHeading}>
                {messages.home.howTitle}
              </h2>

              {/*
              `TutorialStep` rather than a homepage-only row: the guide and the
              intro already teach with this exact shape, and three steps here
              that looked like something else would read as a different product
              one screen before the reader meets the real one. The copy is its
              own — this strip is a summary for someone deciding whether to
              start, not the tutorial they get after deciding.
            */}
              <ol className={styles.steps}>
                <TutorialStep
                  icon="checkThin"
                  title={messages.home.howAnswerTitle}
                  description={messages.home.howAnswerDescription}
                />
                <TutorialStep
                  icon="starThin"
                  title={messages.home.howWeighTitle}
                  description={messages.home.howWeighDescription}
                />
                <TutorialStep
                  icon="results"
                  title={messages.home.howCompareTitle}
                  description={messages.home.howCompareDescription}
                />
              </ol>
            </section>
          </div>
        </main>

        {/*
          Outside `<main>`, which is what makes it a `contentinfo` landmark
          rather than a section of the page's own content.
        */}
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <section className={styles.footerBlock}>
              <h2 className={styles.footerHeading}>{messages.home.aboutTitle}</h2>
              <p className={styles.footerBody}>{messages.home.aboutBody}</p>
              <a className={styles.footerLink} href={SITE_ORGANIZATION.url}>
                {messages.home.aboutLink}
              </a>
            </section>

            <section className={styles.footerBlock}>
              <h2 className={styles.footerHeading}>{messages.home.supportTitle}</h2>
              <p className={styles.footerBody}>{messages.home.supportBody}</p>
              <div className={styles.footerAction}>
                <Button as="a" href={SITE_ORGANIZATION.donateUrl} variant="outline">
                  {messages.home.supportAction}
                </Button>
              </div>
            </section>

            <section className={styles.footerBlock}>
              <h2 className={styles.footerHeading}>{messages.home.contactTitle}</h2>
              <ul className={styles.footerList}>
                <li>
                  <a className={styles.footerLink} href={`mailto:${SITE_ORGANIZATION.email}`}>
                    {SITE_ORGANIZATION.email}
                  </a>
                </li>
                <li>
                  {/* Spaces are fine to read and not fine to dial. */}
                  <a
                    className={styles.footerLink}
                    href={`tel:${SITE_ORGANIZATION.phone.replace(/\s/g, '')}`}
                  >
                    {SITE_ORGANIZATION.phone}
                  </a>
                </li>
                <li>
                  <a className={styles.footerLink} href={SITE_ORGANIZATION.instagramUrl}>
                    {messages.home.socialInstagram}
                  </a>
                </li>
                <li>
                  <a className={styles.footerLink} href={SITE_ORGANIZATION.xUrl}>
                    {messages.home.socialX}
                  </a>
                </li>
              </ul>
            </section>
          </div>
        </footer>
      </div>
    </AppShell>
  );
}

/**
 * How many calculators an election has ready, in that election's own noun —
 * "7 kalkulaček" for a set of variants, "1 město" for municipalities.
 *
 * The picker's vocabulary already declines every one of these correctly for
 * each kind, so this reuses it rather than adding a fourth set of Czech plurals
 * that would have to be kept in step with it.
 */
export function electionCountLabel(kind: DistrictKind, count: number): string {
  return plural(count, districtVocabulary(kind).resultCount);
}
