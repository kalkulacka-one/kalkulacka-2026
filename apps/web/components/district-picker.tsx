'use client';

import { format, getMessages } from '@vk/i18n';
import { OptionRow, SearchField } from '@vk/ui';
import { useMemo, useState } from 'react';
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

export function DistrictPicker({ electionName, districts }: DistrictPickerProps) {
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return districts;
    return districts.filter(
      (district) => normalize(district.name).includes(needle) || district.code.startsWith(needle),
    );
  }, [districts, query]);

  return (
    <Screen
      eyebrow={electionName}
      title={messages.picker.title}
      description={messages.picker.description}
    >
      <SearchField
        value={query}
        onValueChange={setQuery}
        label={messages.picker.searchLabel}
        hideLabel
        placeholder={messages.picker.searchPlaceholder}
        clearLabel={messages.picker.searchClear}
      />

      {matches.length === 0 ? (
        <p className={styles.empty}>{messages.picker.empty}</p>
      ) : (
        <ul className={styles.list}>
          {matches.map((district) => (
            <li key={`${district.code}-${district.slug}`}>
              <OptionRow
                href={district.href}
                label={district.name}
                disabled={!district.available}
                meta={
                  district.available
                    ? district.showCode
                      ? format(messages.picker.districtCode, { code: district.code })
                      : undefined
                    : messages.picker.unavailable
                }
                leading={
                  district.showCode ? (
                    <span className={styles.code}>{district.code}</span>
                  ) : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
