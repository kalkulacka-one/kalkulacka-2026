import { expect, test } from '@playwright/test';
import { messages } from './messages';

/*
 * Fixture mode (see `playwright.config.ts`, which pins `DATA_ENDPOINT` empty):
 * the archive index lists four elections, and Pardubice — komunální 2022 — is
 * the only calculator committed to the repo. So the homepage shows exactly one
 * election, and because that election has exactly one *available* calculator,
 * its card and the hero both skip the picker and link straight to the intro.
 */
const ELECTION_NAME = 'Komunální volby 2022';
const INTRO_PATH = '/volby/komunalni-2022/pardubice/uvod';

test('home leads into the current election in one click', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);

  await expect(
    page.getByRole('heading', { level: 1, name: messages.home.heroTitle, exact: true }),
  ).toBeVisible();
  await expect(page.getByText(messages.home.heroLead)).toBeVisible();

  // The page's whole job: one primary action, and it goes somewhere real.
  const cta = page.getByRole('link', { name: messages.home.heroCta, exact: true });
  await expect(cta).toHaveAttribute('href', INTRO_PATH);

  await cta.click();
  await expect(page).toHaveURL(new RegExp(`${INTRO_PATH}$`));
  await expect(page.getByRole('heading', { name: 'Pardubice', exact: true })).toBeVisible();
});

test('home lists only elections that have a calculator, under working chrome', async ({ page }) => {
  await page.goto('/');

  const elections = page
    .getByRole('list')
    .filter({ has: page.getByRole('link', { name: new RegExp(ELECTION_NAME) }) });

  // One card, not four: the three archive elections with no committed data are
  // dropped rather than listed as dead ends.
  await expect(elections.getByRole('listitem')).toHaveCount(1);
  await expect(elections.getByRole('link', { name: new RegExp(ELECTION_NAME) })).toHaveAttribute(
    'href',
    INTRO_PATH,
  );

  await expect(page.getByRole('main')).toBeVisible();
  // The shell's own menu is here as on every screen — it is the one piece of
  // chrome the whole app shares.
  await expect(page.getByRole('button', { name: messages.menu.label, exact: true })).toBeVisible();

  /*
   * The footer is a `contentinfo` landmark, which it can only be by sitting
   * outside `<main>`. Its links are all external or `mailto:` on purpose: no
   * content page of our own ("O nás", "Soukromí") is built yet, and a dead
   * internal link is worse than an honest absence.
   */
  const footer = page.getByRole('contentinfo');
  await expect(
    footer.getByRole('link', { name: messages.home.aboutLink, exact: true }),
  ).toHaveAttribute('href', 'https://kohovolit.eu');
  await expect(
    footer.getByRole('link', { name: messages.home.supportAction, exact: true }),
  ).toHaveAttribute('href', 'https://www.darujme.cz/darovat/1200653');
  await expect(
    footer.getByRole('link', { name: 'ahoj@volebnikalkulacka.cz', exact: true }),
  ).toHaveAttribute('href', 'mailto:ahoj@volebnikalkulacka.cz');
});
