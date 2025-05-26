import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['api/tests/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    setupFiles: ['api/tests/setupTests.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/server',
    },
    alias: {
      '@db': path.resolve(__dirname, './db'), 
      '@shared': path.resolve(__dirname, './shared'), 
    },
    deps: {
      inline: [], 
    },
  },
});
