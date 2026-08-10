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
});

test('outside /embed/ the wordmark is not a link', async ({ page }) => {
  await page.goto(CANONICAL_INTRO);
  await expect(page.getByRole('heading', { name: CALCULATOR_NAME, exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(`^${messages.app.title}`) })).toHaveCount(
    0,
  );
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

test('the embed actually renders inside an iframe', async ({ page, baseURL }) => {
  await page.setContent(
    `<iframe src="${baseURL}${EMBED_INTRO}" style="width: 420px; height: 700px"></iframe>`,
  );

  await expect(
    page.frameLocator('iframe').getByRole('heading', { name: CALCULATOR_NAME, exact: true }),
  ).toBeVisible();
});
