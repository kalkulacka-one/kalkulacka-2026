import type { IconName } from '@vk/ui';

/**
 * Which icon stands for a topic.
 *
 * The mapping lives here rather than in `@vk/ui` because it is knowledge about
 * Czech question tags, and the design system is meant to stay re-skinnable for
 * data it has never seen. It lives here rather than in `@vk/core` because
 * nothing in the domain depends on it: a wrong icon is a cosmetic miss, not a
 * wrong result.
 *
 * Matching is on keywords rather than on the exact tag, because the tags are
 * editorial text that varies between elections — "Doprava", "Doprava a
 * parkování" and "Dopravní infrastruktura" all want the same tram. Anything
 * unrecognised gets the neutral bookmark rather than a guess: an icon that
 * claims the wrong subject is worse than one that claims none.
 */

/** Diacritics stripped so "Životní" and "zivotni" are the same key to match on. */
function normalize(topic: string): string {
  return topic
    .toLocaleLowerCase('cs')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/**
 * Keyword → icon, tried in order.
 *
 * Order matters where a tag could match twice: "veřejný pořádek" and "veřejné
 * služby" share a stem, so the more specific pair is listed before anything
 * that matches "verejn" alone.
 */
const RULES: readonly (readonly [RegExp, IconName])[] = [
  [/doprav|parkov|mhd|cykl/, 'topicTransport'],
  [/bydlen|byt|nemovit|uzemn|urbanis/, 'topicHousing'],
  [/energet|teplo|energi|odpad/, 'topicEnergy'],
  [/skols|vzdelav|skol/, 'topicEducation'],
  [/socialn|zdravot|senior|rodin/, 'topicSocial'],
  [/zivotni prostred|ekolog|zelen|klima/, 'topicEnvironment'],
  [/kultur|sport|volny cas|turis/, 'topicCulture'],
  [/poradek|bezpecn|kriminal|policie/, 'topicSafety'],
  [/rozpoc|financ|dane|dotac|investic/, 'topicBudget'],
  [/transparen|korupc|otevren|radnice/, 'topicTransparency'],
  [/sluzb|sprav|infrastruktur|verejn/, 'topicServices'],
];

export function topicIcon(topic: string): IconName {
  const key = normalize(topic);
  return RULES.find(([pattern]) => pattern.test(key))?.[1] ?? 'topicOther';
}
