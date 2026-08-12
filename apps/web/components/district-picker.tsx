'use client';

import type { DistrictKind } from '@vk/core';
import { districtVocabulary, format, getMessages, plural } from '@vk/i18n';
import {
  OptionRow,
  OptionRowList,
  type OptionRowListHandle,
  SearchField,
  VisuallyHidden,
} from '@vk/ui';
import { useRouter } from 'next/navigation';
import {
  type KeyboardEvent,
  type RefObject,
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
  /** The embed partner, when this picker renders inside an iframe. */
  embed?: string;
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
export function DistrictPicker({
  electionName,
  districtKind,
  districts,
  embed,
}: DistrictPickerProps) {
  const [query, setQuery] = useState('');
  const listId = useId();
  const router = useRouter();

  /*
   * The kind, rather than a `showCode`-derived guess: the copy differs in more
   * places than the row's badge does, and every one of these sentences has to
   * decline the noun correctly. Which kinds exist is the catalog's business
   * (`@vk/i18n`) — this component renders whichever vocabulary it is handed and
   * needs no edit when a country brings a new one.
   */
  const copy = districtVocabulary(districtKind);

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
   * Which of `available` Enter would jump to, and which row holds the
   * roving `tabIndex={0}` slot for the list below — index rather than a
   * district object, so it stays meaningful across re-renders without
   * needing the district's own identity to be stable. Only ever indexes
   * `available`: an unavailable row has no `href`, so it can never be the
   * target and never receives the highlight, the same restriction Enter
   * itself always had.
   */
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const listHandleRef = useRef<OptionRowListHandle>(null);

  // A fresh result set starts the highlight back at the top rather than
  // carrying over an index from the previous, differently-ordered list. Safe
  // to do unconditionally: typing only happens while focus is in the search
  // field above, never while a row itself is focused, so this never fights
  // a keyboard user mid-navigation through the list.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on `query` as the trigger, not read in the body.
  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  // Keyed on the query as well as the index: a fresh search can leave the
  // list scrolled somewhere from the previous one even on the keystroke where
  // the highlight lands back on index 0 and wouldn't otherwise register as a
  // change. The active row should always be the one in view, whichever of
  // the two moved it there.
  // biome-ignore lint/correctness/useExhaustiveDependencies: both are triggers for the ref-driven scroll, neither is read in the body.
  useEffect(() => {
    listHandleRef.current?.scrollActiveIntoView();
  }, [highlightedIndex, query]);

  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      // ArrowDown is the only arrow key this field claims — typing, then
      // arrowing straight down into the results, should never need a Tab in
      // between. ArrowUp/Left/Right are left alone so the caret still moves
      // with them, same as in any other text field.
      if (event.key === 'ArrowDown') {
        if (available.length === 0) return;
        event.preventDefault();
        setHighlightedIndex(0);
        listHandleRef.current?.focusFirst();
        return;
      }

      // Enter jumps straight to the top match instead of requiring an
      // ArrowDown into the list and a second Enter on the row — the point of
      // typing into a search box is that the keyboard is the whole
      // interaction.
      if (event.key === 'Enter') {
        const target = available[highlightedIndex];
        if (!target) return;
        event.preventDefault();
        router.push(target.href);
      }
    },
    [available, highlightedIndex, router],
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
    <AppShell electionName={electionName} embed={embed}>
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
                        highlightedIndex={highlightedIndex}
                        onHighlightedIndexChange={setHighlightedIndex}
                        listHandleRef={listHandleRef}
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
  highlightedIndex,
  onHighlightedIndexChange,
  listHandleRef,
}: {
  heading?: string;
  hint?: string;
  districts: PickerDistrict[];
  /**
   * The row within *this* group that Enter would jump to, and that holds the
   * roving `tabIndex={0}` slot. Only ever passed to the available group's own
   * call — the unavailable group renders the same component with none of the
   * three roving props, so its rows (already non-interactive `<div>`s, see
   * `OptionRow`) stay out of arrow-key navigation entirely rather than being
   * made focusable just so arrows have something to skip.
   */
  highlightedIndex?: number;
  onHighlightedIndexChange?: (index: number) => void;
  listHandleRef?: RefObject<OptionRowListHandle | null>;
}) {
  const headingId = useId();

  const rows = districts.map((district, index) => {
    const isHighlighted = onHighlightedIndexChange !== undefined && index === highlightedIndex;

    return (
      <li key={`${district.code}-${district.slug}`}>
        <OptionRow
          href={district.href}
          label={district.name}
          disabled={!district.available}
          highlighted={isHighlighted}
          tabIndex={onHighlightedIndexChange !== undefined ? (isHighlighted ? 0 : -1) : undefined}
          /*
           * No "Připravujeme" meta on the unavailable rows: they sit
           * under a heading that already says it, thirty-four times
           * over. The number is the badge rather than a second line,
           * because knowing your obvod's number is how people find it —
           * but a bare digit read out before a place name is not a
           * sentence, hence the spoken prefix.
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
    );
  });

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

      {/*
       * Only the available group is a roving-tabindex `OptionRowList` — its
       * rows are the only ones with an `href` to move between. The
       * unavailable group stays a plain `<ul>`: its rows are inert `<div>`s
       * with nothing for Tab or the arrows to reach either way.
       */}
      {onHighlightedIndexChange !== undefined ? (
        <OptionRowList
          ref={listHandleRef}
          className={styles.list}
          activeIndex={highlightedIndex ?? 0}
          onActiveIndexChange={onHighlightedIndexChange}
        >
          {rows}
        </OptionRowList>
      ) : (
        <ul className={styles.list}>{rows}</ul>
      )}
    </section>
  );
}
