import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only pick up the source-tree tests. Production build artifacts in `dist/` would
    // otherwise be discovered as compiled CommonJS tests that fail to import vitest.
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
  },
});
