'use client';

import type { DistrictKind } from '@vk/core';
import { format, getMessages, plural } from '@vk/i18n';
import { OptionRow, SearchField, VisuallyHidden } from '@vk/ui';
import { useId, useMemo, useState } from 'react';
import styles from './district-picker.module.css';
import { Screen } from './screen';

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

export function DistrictPicker({ electionName, districtKind, districts }: DistrictPickerProps) {
  const [query, setQuery] = useState('');
  const listId = useId();

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

  return (
    <Screen electionName={electionName} title={copy.title} description={copy.description}>
      <SearchField
        value={query}
        onValueChange={setQuery}
        label={copy.searchLabel}
        hideLabel
        placeholder={copy.searchPlaceholder}
        clearLabel={messages.picker.searchClear}
        aria-controls={listId}
      />

      {/*
        The count is only spoken, and only while searching: sighted users watch
        the list itself shorten, but a screen-reader user typing into the field
        gets no signal at all that the results behind them changed.
      */}
      <VisuallyHidden as="output" aria-live="polite">
        {searching
          ? matches.length === 0
            ? format(copy.empty, { query: query.trim() })
            : plural(matches.length, copy.resultCount)
          : ''}
      </VisuallyHidden>

      <div className={styles.results} id={listId}>
        {matches.length === 0 ? (
          <p className={styles.empty}>{format(copy.empty, { query: query.trim() })}</p>
        ) : null}

        {available.length > 0 ? (
          <DistrictGroup
            // Labelled only while there is a second group to tell it apart
            // from — one list under a heading that names the obvious is noise.
            heading={unavailable.length > 0 ? messages.picker.groupAvailable : undefined}
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
    </Screen>
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
