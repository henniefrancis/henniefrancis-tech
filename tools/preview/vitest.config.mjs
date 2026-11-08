import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.mjs'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.mjs'],
      // cli.mjs is a three-line entry point that only calls run(); all logic
      // lives in run.mjs and is covered.
      exclude: ['src/cli.mjs'],
      reporter: ['text'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
