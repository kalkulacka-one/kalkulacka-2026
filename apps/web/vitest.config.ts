import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
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
