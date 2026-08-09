import type { IconName } from '@vk/ui';

/**
 * Topic icon rules — Czech editorial knowledge.
 *
 * Keyword patterns matched against normalized Czech topic tags. Regexes are
 * tried in order; the first match wins. Order matters where tags could match
 * twice: "veřejný pořádek" and "veřejné služby" share a stem, so the more
 * specific pair is listed before anything that matches "verejn" alone.
 *
 * This table lives in config because it is site-specific editorial knowledge,
 * not a reusable component. Adding a country would add a new row here
 * (country locale and rules) and a corresponding section to the message
 * catalog's picker vocabulary for district kinds — no change to the matching
 * mechanism itself.
 */
export const TOPIC_ICON_RULES: readonly (readonly [RegExp, IconName])[] = [
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
