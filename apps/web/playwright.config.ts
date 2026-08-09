import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

/** Isolated from the dev server's 3000 and Storybook's 6006. */
const PORT = 3013;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * The repo root, two levels up from this file — the `webServer` command below
 * needs it because building `@vk/web` first requires building `@vk/tokens`
 * (its dist CSS is gitignored, and `next build` alone never runs it; see
 * `pnpm-workspace.yaml`'s neighbouring comment on `allowBuilds` for the same
 * kind of "generated, not committed" trap).
 */
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    // The suite asserts on state, not on timing — motion only adds a fixed
    // wait (the results screen's "Calculating" beat) that buys nothing here.
    contextOptions: { reducedMotion: 'reduce' },
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    /*
     * A production server, not `next dev`: dev's on-demand compilation and
     * React overlay make first-navigation timing unrepresentative, and this
     * is the same artifact that ships. Self-contained — `pnpm e2e` builds and
     * boots the app itself rather than assuming a prior CI step already did —
     * which is also why `@vk/database` is generated here rather than assumed
     * done: this command is meant to work from a clean worktree.
     */
    command:
      'pnpm --filter @vk/database generate && pnpm build && ' +
      `pnpm --filter @vk/web exec next start --port ${PORT}`,
    cwd: repoRoot,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    // A cold `pnpm build` (tokens + Next's production build) comfortably
    // clears a minute; this leaves room without masking a genuine hang.
    timeout: 180_000,
    /*
     * Every var the app reads (see `apps/web/.env.example`) pinned to empty,
     * regardless of what a developer's own `.env.local` sets — the suite's
     * whole premise is exercising the fixture-mode fallback, and a machine
     * with a real `DATA_ENDPOINT` configured for manual testing must not
     * silently switch these tests onto the network.
     */
    env: {
      DATA_ENDPOINT: '',
      DATABASE_URL: '',
      NEXT_PUBLIC_SESSION_COOKIE_NAME: '',
      DATABASE_INITIALIZED_AT: '',
      NEXT_PUBLIC_BASE_URL: '',
      // Not load-bearing for fixture mode — locale selection is orthogonal
      // to data source — but pinned alongside the rest for the same reason:
      // nothing in this suite should depend on what's in someone's shell.
      NEXT_PUBLIC_LOCALE: '',
    },
  },
});
