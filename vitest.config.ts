import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `apps/*` as well as `packages/*`: with only the latter, a test file added
    // under apps/web would never be collected and the suite would stay green
    // while testing nothing.
    projects: ['packages/*', 'apps/*'],
    // Not every workspace has a suite yet — an empty project should be green
    // rather than red.
    passWithNoTests: true,
  },
});
