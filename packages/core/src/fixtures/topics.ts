/**
 * MOCK DATA — not part of the domain.
 *
 * Archive questions ship with an empty `tags` array, but the card design shows
 * two chips: a filled topic and the question's short name. These topics are
 * lifted from the prototype, which annotated the same 42 Pardubice questions.
 *
 * The real backend supplies tags itself; when it does, delete this file. The
 * card already degrades to a single chip when tags are absent, so nothing
 * depends on this existing.
 */
export const PARDUBICE_TOPICS: Record<string, string> = {
  'komunalni-2022-555134-q-21': 'Energetika',
  'komunalni-2022-555134-q-12': 'Veřejný pořádek',
  'komunalni-2022-555134-q-16': 'Energetika',
  'komunalni-2022-555134-q-15': 'Energetika',
  'komunalni-2022-555134-q-14': 'Energetika',
  'komunalni-2022-555134-q-13': 'Energetika',
  'komunalni-2022-555134-q-17': 'Sociální politika',
  'komunalni-2022-555134-q-5': 'Sociální politika',
  'komunalni-2022-555134-q-7': 'Veřejný pořádek',
  'komunalni-2022-555134-q-3': 'Sociální politika',
  'komunalni-2022-555134-q-1': 'Bydlení',
  'komunalni-2022-555134-q-46': 'Bydlení',
  'komunalni-2022-555134-q-25': 'Bydlení',
  'komunalni-2022-555134-q-31': 'Bydlení',
  'komunalni-2022-555134-q-33': 'Energetika',
  'komunalni-2022-555134-q-37': 'Energetika',
  'komunalni-2022-555134-q-34': 'Kultura a sport',
  'komunalni-2022-555134-q-48': 'Školství',
  'komunalni-2022-555134-q-47': 'Školství',
  'komunalni-2022-555134-q-45': 'Sociální politika',
  'komunalni-2022-555134-q-44': 'Rozpočet',
  'komunalni-2022-555134-q-42': 'Doprava',
  'komunalni-2022-555134-q-41': 'Životní prostředí',
  'komunalni-2022-555134-q-38': 'Doprava',
  'komunalni-2022-555134-q-35': 'Veřejné služby',
  'komunalni-2022-555134-q-8': 'Doprava',
  'komunalni-2022-555134-q-22': 'Školství',
  'komunalni-2022-555134-q-23': 'Doprava',
  'komunalni-2022-555134-q-24': 'Doprava',
  'komunalni-2022-555134-q-27': 'Doprava',
  'komunalni-2022-555134-q-28': 'Bydlení',
  'komunalni-2022-555134-q-29': 'Rozpočet',
  'komunalni-2022-555134-q-30': 'Doprava',
  'komunalni-2022-555134-q-4': 'Doprava',
  'komunalni-2022-555134-q-9': 'Doprava',
  'komunalni-2022-555134-q-10': 'Transparentnost',
  'komunalni-2022-555134-q-11': 'Transparentnost',
  'komunalni-2022-555134-q-18': 'Transparentnost',
  'komunalni-2022-555134-q-19': 'Transparentnost',
  'komunalni-2022-555134-q-20': 'Bydlení',
  'komunalni-2022-555134-q-32': 'Doprava',
  'komunalni-2022-555134-q-43': 'Kultura a sport',
};
