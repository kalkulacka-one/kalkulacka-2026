'use client';

import type { DistrictKind } from '@vk/core';
import { format, getMessages, plural } from '@vk/i18n';
import { OptionRow, SearchField, VisuallyHidden } from '@vk/ui';
import { useRouter } from 'next/navigation';
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppShell } from './app-shell';
import styles from './district-picker.module.css';

export type PickerDistrict = {
  code: string;
  name: string;
  slug: string;
  showCode: boolean;
  /** Whether we actually hold data for it. Only Pardubice does, so far. */
  available: boolean;
  href: string;
};

export type DistrictPickerProps = {
  electionName: string;
  /** Decides the screen's whole vocabulary — a město is not an obvod. */
  districtKind: DistrictKind;
  districts: PickerDistrict[];
};

const messages = getMessages();

/**
 * Fold diacritics so "plzen" finds "Plzeň".
 *
 * Czech users routinely type without them, and a picker of 35 cities that only
 * matches the accented spelling is a picker that looks broken.
 */
function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * The region picker.
 *
 * Built directly on `AppShell` rather than the generic `Screen` — the same
 * departure the recap took, and for the same reason. `Screen` scrolls the
 * whole document, so the title, the description and the search box scrolled
 * away with the first city on a phone, leaving the field you'd actually type
 * into off-screen the moment the list grew past a few rows. Here the header
 * is a fixed row and only `.listWrap` scrolls underneath it.
 */
export function DistrictPicker({ electionName, districtKind, districts }: DistrictPickerProps) {
  const [query, setQuery] = useState('');
  const listId = useId();
  const router = useRouter();

  /*
   * `municipality` / `senate` rather than a `showCode`-derived guess: the copy
   * differs in more places than the row's badge does, and every one of these
   * sentences has to decline the noun correctly.
   */
  const copy = messages.picker[districtKind];

  const matches = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return districts;
    return districts.filter(
      (district) => normalize(district.name).includes(needle) || district.code.startsWith(needle),
    );
  }, [districts, query]);

  /*
   * The one calculator that exists is otherwise the 24th of 35 identical-looking
   * rows, every other one of them dead. Splitting the list is what makes the
   * screen answer "what can I actually do here?" without scrolling. When the
   * real backend lands and everything is available the second group is empty
   * and this collapses back to one plain list on its own.
   */
  const available = matches.filter((district) => district.available);
  const unavailable = matches.filter((district) => !district.available);

  const searching = query.trim().length > 0;

  /*
   * Enter jumps straight to the top match instead of requiring a Tab into the
   * list and a second Enter on the row — the point of typing into a search box
   * is that the keyboard is the whole interaction. Only ever the first
   * *available* match: an unavailable row has no `href`, so there is nowhere
   * for Enter to go, and picking one silently would look like it did
   * something.
   */
  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter') return;
      const first = available[0];
      if (!first) return;
      event.preventDefault();
      router.push(first.href);
    },
    [available, router],
  );

  // Only there to say "there's more above/below" — both start hidden, since a
  // short result list (or the empty state) has nothing to hint at.
  const [scrolledDown, setScrolledDown] = useState(false);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const updateFades = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setScrolledDown(el.scrollTop > 4);
    setHasMoreBelow(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  }, []);

  // A new search can turn a scrollable list into a short one (or the reverse)
  // without a scroll event ever firing, so the fades need their own check
  // whenever the result set changes, not only on scroll.
  useEffect(() => {
    updateFades();
  }, [updateFades]);

  return (
    <AppShell electionName={electionName}>
      <main className={styles.screen}>
        <div className={styles.inner}>
          <header className={styles.header}>
            <h1 className={styles.title}>{copy.title}</h1>
            <p className={styles.description}>{copy.description}</p>

            <SearchField
              value={query}
              onValueChange={setQuery}
              label={copy.searchLabel}
              hideLabel
              placeholder={copy.searchPlaceholder}
              clearLabel={messages.picker.searchClear}
              aria-controls={listId}
              onKeyDown={handleSearchKeyDown}
            />

            {/*
              The count is only spoken, and only while searching: sighted users
              watch the list itself shorten, but a screen-reader user typing
              into the field gets no signal at all that the results behind them
              changed.
            */}
            <VisuallyHidden as="output" aria-live="polite">
              {searching
                ? matches.length === 0
                  ? format(copy.empty, { query: query.trim() })
                  : plural(matches.length, copy.resultCount)
                : ''}
            </VisuallyHidden>
          </header>

          <div className={styles.listShell}>
            {matches.length === 0 ? (
              <p className={styles.empty}>{format(copy.empty, { query: query.trim() })}</p>
            ) : (
              <>
                <div
                  className={styles.topFade}
                  data-visible={scrolledDown || undefined}
                  aria-hidden="true"
                />

                <div ref={listRef} id={listId} className={styles.listWrap} onScroll={updateFades}>
                  <div className={styles.results}>
                    {available.length > 0 ? (
                      <DistrictGroup
                        // Labelled only while there is a second group to tell
                        // it apart from — one list under a heading that names
                        // the obvious is noise.
                        heading={
                          unavailable.length > 0 ? messages.picker.groupAvailable : undefined
                        }
                        districts={available}
                      />
                    ) : null}

                    {unavailable.length > 0 ? (
                      <DistrictGroup
                        heading={messages.picker.unavailable}
                        hint={copy.groupUnavailableHint}
                        districts={unavailable}
                      />
                    ) : null}
                  </div>
                </div>

                <div
                  className={styles.bottomFade}
                  data-visible={hasMoreBelow || undefined}
                  aria-hidden="true"
                />
              </>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}

function DistrictGroup({
  heading,
  hint,
  districts,
}: {
  heading?: string;
  hint?: string;
  districts: PickerDistrict[];
}) {
  const headingId = useId();

  return (
    <section aria-labelledby={heading ? headingId : undefined} className={styles.group}>
      {heading ? (
        <div className={styles.groupHeader}>
          <h2 id={headingId} className={styles.groupHeading}>
            {heading}
          </h2>
          {hint ? <p className={styles.groupHint}>{hint}</p> : null}
        </div>
      ) : null}

      <ul className={styles.list}>
        {districts.map((district) => (
          <li key={`${district.code}-${district.slug}`}>
            <OptionRow
              href={district.href}
              label={district.name}
              disabled={!district.available}
              /*
               * No "Připravujeme" meta on the unavailable rows: they sit under
               * a heading that already says it, thirty-four times over. The
               * number is the badge rather than a second line, because knowing
               * your obvod's number is how people find it — but a bare digit
               * read out before a place name is not a sentence, hence the
               * spoken prefix.
               */
              leading={
                district.showCode ? (
                  <span className={styles.code}>
                    <VisuallyHidden>{messages.picker.districtCodeLabel}</VisuallyHidden>
                    {district.code}
                  </span>
                ) : undefined
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
