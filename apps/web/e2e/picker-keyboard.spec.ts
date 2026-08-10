import { expect, test } from '@playwright/test';
import { messages } from './messages';

/*
 * The keyboard-only pass through the district picker (see
 * `apps/web/components/district-picker.tsx` and
 * `packages/ui/src/option-row/option-row-list.tsx`). This suite's own
 * automation browser cannot reliably synthesize every arrow-key event
 * against a real focus target — jsdom + `@testing-library/user-event`
 * already covers the roving-tabindex mechanics themselves in
 * `packages/ui/src/option-row/option-row-list.test.tsx` — so Playwright is
 * what actually proves it out end to end, in a real browser, against the
 * page as shipped.
 *
 * Fixture mode (this suite's `DATA_ENDPOINT`-less default; see
 * `playwright.config.ts`) lists exactly one available calculator —
 * Pardubice, komunální 2022 — with the other 34 cities in the fixture index
 * unavailable. One available row is enough to prove the handoff and the
 * activation; the roving-tabindex *movement* between several rows is what
 * the unit suite is for.
 */
const ELECTION_PATH = '/volby/komunalni-2022';
const CALCULATOR_NAME = 'Pardubice';

test('a keyboard-only pass through the picker: search, ArrowDown into the list, Enter to the intro', async ({
  page,
}) => {
  await page.goto(ELECTION_PATH);
  await expect(
    page.getByRole('heading', { name: messages.picker.municipality.title, exact: true }),
  ).toBeVisible();

  const search = page.getByRole('searchbox', {
    name: messages.picker.municipality.searchLabel,
  });
  await search.focus();
  await expect(search).toBeFocused();

  // Typed without diacritics, on purpose — the same fold `normalize()` in
  // `district-picker.tsx` exists for, and it narrows the 35-city fixture
  // index down to the one available row.
  await search.pressSequentially('pardu');

  const row = page.getByRole('link', { name: CALCULATOR_NAME, exact: true });
  await expect(row).toBeVisible();

  // The point of the whole feature: ArrowDown from the search field lands
  // real focus on the row, with no Tab in between.
  await search.press('ArrowDown');
  await expect(row).toBeFocused();

  // Only one row is available in fixture mode, so there's nowhere for
  // ArrowDown to go — this is the "stop, don't wrap" choice showing up as
  // "focus doesn't move at all" rather than looping back onto itself.
  await row.press('ArrowDown');
  await expect(row).toBeFocused();
  await row.press('Home');
  await expect(row).toBeFocused();

  // Activating the row from real keyboard focus — not a click — is what
  // makes this a keyboard-only pass end to end.
  await row.press('Enter');
  await expect(page).toHaveURL(/\/volby\/komunalni-2022\/pardubice\/uvod$/);
  await expect(page.getByRole('heading', { name: CALCULATOR_NAME, exact: true })).toBeVisible();
});

test('ArrowUp, Left and Right stay with the search field caret — only ArrowDown is claimed', async ({
  page,
}) => {
  await page.goto(ELECTION_PATH);

  const search = page.getByRole('searchbox', {
    name: messages.picker.municipality.searchLabel,
  });
  const row = page.getByRole('link', { name: CALCULATOR_NAME, exact: true });

  await search.focus();
  await search.pressSequentially('pardu');

  /*
   * Left/Right/Up are exercised, then typing still lands in the field and
   * the row never picked up focus — not asserting a specific caret position,
   * since Chromium's own native behaviour for ArrowUp in a single-line input
   * is to jump the caret to the start (there being no line above), which
   * would make an exact-position assertion fragile without saying anything
   * about the one thing this test cares about: whether the *component*
   * intercepted the key. It didn't — only ArrowDown does (see
   * `handleSearchKeyDown` in `district-picker.tsx`) — so all three keys stay
   * on the browser's own default handling of the input.
   */
  await search.press('ArrowLeft');
  await search.press('ArrowRight');
  await search.press('ArrowUp');
  await expect(search).toBeFocused();
  await expect(row).not.toBeFocused();

  await search.pressSequentially('!');
  await expect(search).toHaveValue(/pardu/);
  await expect(search).toHaveValue(/!/);
});
