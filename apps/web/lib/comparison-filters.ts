import {
  RECAP_FILTER_ALL,
  RECAP_FILTER_IMPORTANT,
  RECAP_TOPIC_PREFIX,
  type RecapFilterId,
  slugifyDistrict,
  topicFilterId,
} from '@vk/core';

/**
 * The comparison view's filter, as a URL segment.
 *
 * `/porovnani` is everything, `/porovnani/dulezite` the starred questions, and
 * `/porovnani/<topic>` one theme — which is what lets a dashboard card be a
 * plain link and a filtered view survive being shared. The slugs ride on
 * `slugifyDistrict`: it is the URL grammar's own "Czech words to a path
 * segment" rule, and topics are exactly that.
 */

const IMPORTANT_SLUG = 'dulezite';

export function comparisonFilterSlug(filter: RecapFilterId): string | undefined {
  if (filter === RECAP_FILTER_ALL) return undefined;
  if (filter === RECAP_FILTER_IMPORTANT) return IMPORTANT_SLUG;
  return slugifyDistrict(filter.slice(RECAP_TOPIC_PREFIX.length)) || undefined;
}

/**
 * The inverse, resolved against the calculator's actual topics. Anything that
 * matches nothing — a stale link, a typo — degrades to "all" rather than a
 * 404: the reader still lands on the view they were promised, just unfiltered.
 */
export function comparisonFilterFromSlug(
  slug: string | undefined,
  topics: string[],
): RecapFilterId {
  if (!slug) return RECAP_FILTER_ALL;
  if (slug === IMPORTANT_SLUG) return RECAP_FILTER_IMPORTANT;

  const topic = topics.find((candidate) => slugifyDistrict(candidate) === slug);
  return topic ? topicFilterId(topic) : RECAP_FILTER_ALL;
}
