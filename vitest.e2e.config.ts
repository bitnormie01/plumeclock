import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/e2e/**/*.e2e.test.ts'],
    environment: 'node',
    testTimeout: 240000,
    hookTimeout: 120000,
    fileParallelism: false,
  },
});
