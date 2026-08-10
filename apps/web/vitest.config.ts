import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `e2e/*.spec.ts` matches Vitest's own default glob, but those files are
    // Playwright tests (`@playwright/test`'s `test`/`expect`, a browser, a
    // running server) — collecting them here just fails on the wrong runner.
    // They have their own command (`pnpm e2e`); this only has to stay out of
    // their way.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
  resolve: {
    alias: {
      // `server-only` throws on import anywhere outside a React Server
      // context — that loudness is wanted in the app, not in tests, which
      // exercise the server modules directly.
      'server-only': fileURLToPath(new URL('./test/server-only-stub.ts', import.meta.url)),
      // Mirrors the `@/*` path mapping in tsconfig.json, which Vitest doesn't
      // read on its own.
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
});
