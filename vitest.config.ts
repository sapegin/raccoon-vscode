import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', 'out/**'],
  },
  resolve: {
    alias: {
      vscode: new URL('__mocks__/vscode.ts', import.meta.url).pathname,
    },
  },
});
