import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/tests/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    setupFiles: ['server/tests/setupTests.ts'], // Added setup file
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
