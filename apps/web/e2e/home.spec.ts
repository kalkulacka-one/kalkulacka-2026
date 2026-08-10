import { expect, test } from '@playwright/test';
import { messages } from './messages';

/**
 * The homepage is Phase 8 (see `app/[[...path]]/page.tsx`) — today it renders
 * the app shell around a "Připravujeme" placeholder rather than an election
 * picker. This is what the calculator flow test starts from instead of
 * clicking a link that does not exist yet; asserting it here means that gap
 * closing later shows up as a failure here, not as a silent assumption in the
 * bigger test.
 */
test('home renders the app shell around the coming-soon placeholder', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole('heading', { name: messages.comingSoon.title, exact: true }),
  ).toBeVisible();
  await expect(page.getByText(messages.comingSoon.description)).toBeVisible();

  // The shell's own menu is present even here — it's the one thing every
  // screen in the app shares, placeholder included.
  await expect(page.getByRole('button', { name: messages.menu.label, exact: true })).toBeVisible();
});
