import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*'],
    // Phase 1 brings the first real suites (adapter, matching, routing). Until
    // then an empty run should be green rather than red.
    passWithNoTests: true,
  },
});
