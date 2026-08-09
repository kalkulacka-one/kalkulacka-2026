import { expect, test } from '@playwright/test';
import { messages } from './messages';

/**
 * `@vk/core`'s route parser 404s on anything it doesn't recognise (see
 * `packages/core/src/routing/routes.ts`), and the app's own `not-found.tsx`
 * renders into that — not Next's default page — because the root layout's
 * fixed backdrop sits above Next's default and would swallow it. This is what
 * proves that wiring end to end, from an address the router rejects to
 * localised copy on screen.
 */
test('an unknown URL renders the app custom 404, not a blank page', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');

  expect(response?.status()).toBe(404);

  await expect(
    page.getByRole('heading', { name: messages.notFound.title, exact: true }),
  ).toBeVisible();
  await expect(page.getByText(messages.notFound.description)).toBeVisible();

  const home = page.getByRole('link', { name: messages.notFound.homeLabel, exact: true });
  await expect(home).toHaveAttribute('href', '/');
});

/**
 * A different code path to the same page: `/volby/<key>` parses fine (it's a
 * well-formed election route), but `loadElection` finds nothing for a key the
 * fixture index doesn't list, and the page calls `notFound()` itself.
 */
test('an unknown election key 404s rather than rendering an empty picker', async ({ page }) => {
  const response = await page.goto('/volby/does-not-exist');

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole('heading', { name: messages.notFound.title, exact: true }),
  ).toBeVisible();
});
