import { defineConfig } from 'oxlint';
import typescript from 'oxlint-config-raccoon/typescript';

export default defineConfig({
  extends: [typescript],
  options: {
    typeAware: true,
    typeCheck: true,
  },
  ignorePatterns: ['extensions/*/out'],
});
