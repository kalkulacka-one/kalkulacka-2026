import { expect, test } from '@playwright/test';
import { messages } from './messages';

/**
 * Embeds are the same route grammar behind `/embed/<partner>/` (see
 * `packages/core/src/routing/routes.ts`), gated by the partner registry in
 * `apps/web/config/embeds.ts`. This suite proves the three things a partner
 * integration rests on: the registry gate, the chrome differences, and the
 * framing headers — the app *refusing* to be framed everywhere else is as much
 * part of the contract as the embed allowing it.
 */

const CALCULATOR_NAME = 'Pardubice';
const EMBED_INTRO = '/embed/default/volby/komunalni-2022/pardubice/uvod';
const CANONICAL_INTRO = '/volby/komunalni-2022/pardubice/uvod';

test('an unregistered partner name is a 404, not a generic embed', async ({ page }) => {
  const response = await page.goto('/embed/not-a-partner/volby/komunalni-2022/pardubice/uvod');
  expect(response?.status()).toBe(404);
});

test('embedding the homepage is not a thing', async ({ page }) => {
  const response = await page.goto('/embed/default');
  expect(response?.status()).toBe(404);
});

test('a registered embed renders the flow with embed chrome', async ({ page }) => {
  await page.goto(EMBED_INTRO);

  await expect(page.getByRole('heading', { name: CALCULATOR_NAME, exact: true })).toBeVisible();

  // The wordmark doubles as the attribution: an outbound link to the full
  // site, opened in a new tab so it escapes the iframe.
  const attribution = page.getByRole('link', { name: new RegExp(`^${messages.app.title}`) });
  await expect(attribution).toHaveAttribute('href', '/');
  await expect(attribution).toHaveAttribute('target', '_blank');

  // The menu keeps help and restart but drops "Opustit kalkulačku" — leaving
  // an iframe by navigating it to our homepage would strand the visitor.
  // Role-scoped: the help *dialog*'s (closed) title carries the same text as
  // the help menu item, and a bare text locator trips strict mode on the pair.
  await page.getByRole('button', { name: messages.menu.label }).click();
  await expect(
    page.getByRole('menuitem', { name: new RegExp(`^${messages.menu.help}`) }),
  ).toBeVisible();
  await expect(page.getByRole('menuitem', { name: new RegExp(messages.menu.leave) })).toHaveCount(
    0,
  );
  await page.keyboard.press('Escape');

  // Every link in the flow stays under the partner prefix.
  const start = page.getByRole('link', { name: messages.intro.start, exact: true });
  await expect(start).toHaveAttribute(
    'href',
    '/embed/default/volby/komunalni-2022/pardubice/navod',
  );

  // No back link to the picker: the partner embedded this one calculator, so
  // the intro is the entry point — there is no "up" inside the deal.
  await expect(page.getByRole('link', { name: 'Komunální volby 2022' })).toHaveCount(0);
});

test('outside /embed/ the wordmark is not a link and the picker back link stays', async ({
  page,
}) => {
  await page.goto(CANONICAL_INTRO);
  await expect(page.getByRole('heading', { name: CALCULATOR_NAME, exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(`^${messages.app.title}`) })).toHaveCount(
    0,
  );
  await expect(page.getByRole('link', { name: 'Komunální volby 2022' })).toBeVisible();
});

test('framing headers split at /embed/: embeds may be framed, the app may not', async ({
  page,
}) => {
  const canonical = await page.request.get(CANONICAL_INTRO);
  expect(canonical.headers()['x-frame-options']).toBe('DENY');
  expect(canonical.headers()['content-security-policy-report-only']).toContain(
    "frame-ancestors 'none'",
  );

  const embedded = await page.request.get(EMBED_INTRO);
  expect(embedded.headers()['x-frame-options']).toBeUndefined();
  expect(embedded.headers()['content-security-policy-report-only']).toContain('frame-ancestors *');
});

test('a themed partner runs under its brand theme, with the dead mode toggle withheld', async ({
  page,
}) => {
  // A dark preference stored on the main site must not leak into a
  // single-mode partner theme — that combination (partner accents on the
  // default theme's dark surfaces) is a palette nobody authored.
  await page.addInitScript(() => localStorage.setItem('vk-color-mode', 'dark'));

  await page.goto('/embed/alarm/volby/komunalni-2022/pardubice/uvod');

  // Set by the pre-paint bootstrap script in the root layout, so no flash of
  // the default theme — asserted on <html>, where the token stylesheets look.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'alarm');

  // The stored dark override is on the element (the color-mode bootstrap ran)
  // but the single-mode theme's color-scheme pin outranks it.
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe(
    'light',
  );

  // Partner themes are single-mode, which makes the dark-mode toggle a
  // control that does nothing; the menu withholds it.
  await page.getByRole('button', { name: messages.menu.label }).click();
  await expect(
    page.getByRole('menuitem', { name: new RegExp(messages.menu.darkMode) }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('menuitem', { name: new RegExp(messages.menu.lightMode) }),
  ).toHaveCount(0);
});

test('the embed actually renders inside an iframe', async ({ page, baseURL }) => {
  await page.setContent(
    `<iframe src="${baseURL}${EMBED_INTRO}" style="width: 420px; height: 700px"></iframe>`,
  );

  await expect(
    page.frameLocator('iframe').getByRole('heading', { name: CALCULATOR_NAME, exact: true }),
  ).toBeVisible();
});
