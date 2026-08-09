import type { IconName } from '@vk/ui';
import { TOPIC_ICON_RULES } from '../config/topic-icon-rules';

/**
 * Which icon stands for a topic.
 *
 * The matching mechanism lives here — take a topic name, normalize it, and
 * test it against a set of keyword patterns to land on an icon. Anything
 * unrecognised gets the neutral bookmark rather than a guess: an icon that
 * claims the wrong subject is worse than one that claims none.
 *
 * The rules themselves — the keyword patterns and their icons — are site
 * knowledge and live in config, not here. Adding a country would add rules to
 * config/topic-icon-rules.ts; this file stays purely the mechanism.
 */

/**
 * Diacritics stripped so "Životní" and "zivotni" are the same key to match on.
 *
 * Uses Czech locale for normalization because it applies to Czech topic tags.
 */
function normalize(topic: string): string {
  return topic
    .toLocaleLowerCase('cs')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function topicIcon(topic: string): IconName {
  const key = normalize(topic);
  return TOPIC_ICON_RULES.find(([pattern]) => pattern.test(key))?.[1] ?? 'topicOther';
}
