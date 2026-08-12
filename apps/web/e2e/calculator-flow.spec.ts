import { expect, type Page, test } from '@playwright/test';
import { format, messages } from './messages';

/**
 * A `FilterChips` chip by its label.
 *
 * The chip's accessible name is the label plus its count (e.g. "Důležité
 * 1" — see `packages/ui/src/filter-chips/filter-chips.tsx`), so an `exact`
 * match on the label alone never matches and a substring match matches too
 * much: every recap row's own star toggle is named "Pro mě důležité", which
 * *contains* "Důležité". Anchoring the label to the start of the name avoids
 * both without hard-coding a count that this suite doesn't own.
 *
 * Anchored with `(\s|$)` rather than `\b`: JS regex word boundaries are
 * ASCII-only, and every one of these labels ends in a Czech accented letter
 * that `\b` does not treat as a word character at all — `/^Důležité\b/`
 * silently never matches "Důležité 1".
 */
function filterChip(page: Page, label: string) {
  return page.getByRole('button', { name: new RegExp(`^${escapeRegExp(label)}(\\s|$)`) });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/*
 * The fixture calculator this suite exercises: Pardubice, komunální 2022 (see
 * `packages/core/src/fixtures/data/komunalni-2022-555134.json`). It's the one
 * calculator committed to the repo — every other city in the fixture index is
 * listed but unavailable — which is exactly why fixture mode picks it, and
 * exactly why this suite does too.
 */
const ELECTION_PATH = '/volby/komunalni-2022';
const CALCULATOR_NAME = 'Pardubice';
const TOTAL_QUESTIONS = 42;
const CANDIDATE_COUNT = 9;
/** How many ranking rows show before "Zobrazit další strany" — see `results.tsx`. */
const COLLAPSED_RESULTS = 5;

// The first four questions, in fixture order, and what this test does with
// each — one of every action the deck supports. Matched as a *substring* of a
// recap row's accessible name (title + answer, concatenated — see
// `RecapRow`), so these are deliberately not `exact`.
const Q1_AGREE = 'Omezení vánoční výzdoby';
const Q2_DISAGREE = 'Regulace zábavní pyrotechniky';
const Q3_SKIP = 'Úspora energií – omezení vytápění';
const Q4_IMPORTANT_AGREE = 'Úspora energií – veřejné osvětlení';

test('completes a calculator from the picker through to ranked results, and shares from there', async ({
  page,
}) => {
  await test.step('election picker lists the available calculator', async () => {
    // No link to here exists on the homepage yet (see `home.spec.ts`) — this
    // is the address that link will eventually point at.
    await page.goto(ELECTION_PATH);
    await expect(
      page.getByRole('heading', { name: messages.picker.municipality.title, exact: true }),
    ).toBeVisible();

    await page.getByRole('link', { name: CALCULATOR_NAME, exact: true }).click();
    await expect(page).toHaveURL(/\/volby\/komunalni-2022\/pardubice\/uvod$/);
  });

  await test.step('intro names the calculator and leads to the guide', async () => {
    await expect(page.getByRole('heading', { name: CALCULATOR_NAME, exact: true })).toBeVisible();
    await page.getByRole('link', { name: messages.intro.start, exact: true }).click();
    await expect(page).toHaveURL(/\/navod$/);
  });

  await test.step('guide leads to the first question', async () => {
    await expect(
      page.getByRole('heading', { name: messages.guide.title, exact: true }),
    ).toBeVisible();
    await page.getByRole('link', { name: messages.guide.start, exact: true }).click();
    await expect(page).toHaveURL(/\/otazka\/1$/);
  });

  await test.step('answers a mix of agree, disagree, skip and important', async () => {
    // Q1: agree — the card's own "Souhlasím" button, which also commits and
    // advances in one action.
    await page.getByRole('button', { name: messages.flow.agree, exact: true }).click();
    await expect(page).toHaveURL(/\/otazka\/2$/);

    // Q2: disagree.
    await page.getByRole('button', { name: messages.flow.disagree, exact: true }).click();
    await expect(page).toHaveURL(/\/otazka\/3$/);

    // Q3: skip — via the nav's forward control, which reads "Přeskočit"
    // while the question has no answer yet.
    await page.getByRole('button', { name: messages.flow.skip, exact: true }).click();
    await expect(page).toHaveURL(/\/otazka\/4$/);

    // Q4: mark important first (arms the flag without answering), then
    // agree — the flag carries into the recorded answer.
    const importantToggle = page.getByRole('button', {
      name: messages.flow.important,
      exact: true,
    });
    await importantToggle.click();
    await expect(importantToggle).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: messages.flow.agree, exact: true }).click();
    await expect(page).toHaveURL(/\/otazka\/5$/);
  });

  await test.step('recap reflects exactly those four answers', async () => {
    /*
     * The remaining 38 questions were never visited, so this jumps straight
     * to the recap rather than clicking "Další"/"Přeskočit" another 38
     * times — the recap and the results are reachable from any point in the
     * flow by design (see `Recap`/`Results`), not only after the last card.
     */
    await page.goto('/volby/komunalni-2022/pardubice/rekapitulace');
    await expect(
      page.getByRole('heading', { name: messages.recap.title, exact: true }),
    ).toBeVisible();

    await expect(
      page.getByText(format(messages.recap.summary, { answered: 3, total: TOTAL_QUESTIONS })),
    ).toBeVisible();

    // Text content, not just the accessible name: the row's answer mark is a
    // visually-hidden label sitting right next to the question's own title
    // inside the same button (see `RecapRow`/`AnswerMark`).
    await expect(page.getByRole('button', { name: Q1_AGREE })).toContainText(messages.flow.agree);
    await expect(page.getByRole('button', { name: Q2_DISAGREE })).toContainText(
      messages.flow.disagree,
    );
    // Skipped reads as "no position" — same mark a never-reached question
    // wears (see `RecapRow`'s own comment on that) — but it must not have
    // picked up either answer.
    const skippedRow = page.getByRole('button', { name: Q3_SKIP });
    await expect(skippedRow).not.toContainText(messages.flow.agree);
    await expect(skippedRow).not.toContainText(messages.flow.disagree);

    // "Důležité" only appears as a filter once something is marked — isolate
    // it and confirm it leaves exactly the one question armed above.
    await filterChip(page, messages.recap.filterImportant).click();
    const importantRows = page.getByRole('list').getByRole('listitem');
    await expect(importantRows).toHaveCount(1);
    await expect(page.getByRole('button', { name: Q4_IMPORTANT_AGREE })).toContainText(
      messages.flow.agree,
    );

    await filterChip(page, messages.recap.filterAll).click();
  });

  await test.step('results rank every candidate by match', async () => {
    await page.getByRole('link', { name: messages.recap.showResults, exact: true }).click();
    await expect(page).toHaveURL(/\/vysledek$/);

    await expect(
      page.getByRole('heading', { name: messages.results.title, exact: true }),
    ).toBeVisible();

    /*
     * The results screen also renders `ResultsDashboard`'s topic/legend/
     * consensus lists in the same pane, so a bare `getByRole('list')` would
     * count rows from all of them. Scoping to the list that contains the
     * winner's "Největší shoda" tag isolates the ranking itself — that tag
     * only ever appears on the top `MatchRow`.
     */
    const ranking = page.getByRole('list').filter({ hasText: messages.results.winner });
    // The tail folds behind "Zobrazit další strany": five rows first, the
    // full field only on request — and the unfold is one-way.
    await expect(ranking.getByRole('listitem')).toHaveCount(COLLAPSED_RESULTS);
    await page.getByRole('button', { name: messages.results.showMoreParties }).click();
    await expect(ranking.getByRole('listitem')).toHaveCount(CANDIDATE_COUNT);
    // Only three questions were answered, so a tie for first is expected
    // (`.first()` rather than asserting a single match) — the winner tag
    // exists at all is what this confirms.
    await expect(page.getByText(messages.results.winner).first()).toBeVisible();
  });

  await test.step('a comparison takes focus, and Escape hands it back to the row', async () => {
    const ranking = page.getByRole('list').filter({ hasText: messages.results.winner });
    const topRow = ranking.getByRole('listitem').first().getByRole('button');
    await topRow.click();

    /*
     * The pane names itself after whoever's comparison it is holding, which
     * makes it the one `region` on this screen — the dashboard's own cards are
     * `<section>`s with no accessible name, so they are not landmarks. Focus
     * goes to that name: it is the single thing a reader has to be told before
     * the forty-two rows underneath it.
     */
    const comparison = page.getByRole('region');
    await expect(comparison).toBeVisible();
    await expect(comparison.getByRole('heading', { level: 2 })).toBeFocused();

    // Escape is the third way out, beside the close button and the phone's
    // drag handle — and it puts the reader back where they were, rather than
    // unmounting the focused control and dropping them at the top of the page.
    await page.keyboard.press('Escape');
    await expect(comparison).toHaveCount(0);
    await expect(topRow).toBeFocused();
  });

  await test.step('the answers comparison lists every question and unfolds a party group', async () => {
    await page.getByRole('link', { name: messages.results.compareAnswers, exact: true }).click();
    await expect(page).toHaveURL(/\/porovnani$/);

    await expect(
      page.getByRole('heading', { name: messages.comparison.title, exact: true }),
    ).toBeVisible();

    // Every question appears — including the ones this run never answered.
    // Scoped by the "Vy:" meta line every row carries, which no other list
    // on this screen has.
    const rows = page.getByRole('list').filter({ hasText: `${messages.comparison.you}:` });
    await expect(rows.getByRole('listitem')).toHaveCount(TOTAL_QUESTIONS);

    // Opening a question reveals the per-answer groups with the party rows —
    // the row's first button is its statement toggle.
    await rows.getByRole('listitem').first().getByRole('button').first().click();
    await expect(
      page.getByRole('heading', { name: new RegExp(`^${messages.results.answerYes}`) }).first(),
    ).toBeVisible();

    // The back link returns to the ranking.
    await page.getByRole('link', { name: messages.comparison.back, exact: true }).click();
    await expect(page).toHaveURL(/\/vysledek$/);
  });

  await test.step('share dialog opens with the desktop pair — no backend, no share sheet', async () => {
    await page.getByRole('button', { name: messages.results.share, exact: true }).click();

    /*
     * Matched by role *and* name, which is the assertion that every `Dialog`
     * on this page (help, restart, leave, this one) labels itself rather than
     * borrowing a sibling's heading — they used to share one `aria-labelledby`
     * id derived from a CSS module class, so the browser resolved all four to
     * whichever came first in the DOM.
     */
    const dialog = page.getByRole('dialog', { name: messages.results.shareDialog.title });
    await expect(dialog).toBeVisible();

    // No `NEXT_PUBLIC_SESSION_COOKIE_NAME`/`DATABASE_URL` means `canSync()` is
    // false, so `ShareDialog` never receives a `link` and never renders the
    // "Kopírovat odkaz" action (see `results.tsx`/`share-dialog.tsx`).
    await expect(
      dialog.getByRole('button', { name: messages.results.shareDialog.copyLink, exact: true }),
    ).toHaveCount(0);

    // `Desktop Chrome` reports a fine, hovering pointer, which `chooseShareMode`
    // (see `apps/web/lib/share-mode.ts`) always sends to the copy/download pair
    // — never the OS share sheet, regardless of what `navigator.share` itself
    // claims to support (the macOS Safari "Copy" trap that pair exists to
    // avoid). So the sheet's own label must be absent, not merely optional.
    await expect(
      dialog.getByRole('button', { name: messages.results.shareDialog.shareImage, exact: true }),
    ).toHaveCount(0);

    await expect(
      dialog.getByRole('button', { name: messages.results.shareDialog.copyImage, exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: messages.results.shareDialog.download, exact: true }),
    ).toBeVisible();
  });
});
