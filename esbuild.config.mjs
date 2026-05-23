import { builtinModules } from 'node:module';
import process from 'node:process';
import esbuild from 'esbuild';

const prod = process.argv[2] === 'production';

const context = await esbuild.context({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  external: ['vscode', ...builtinModules],
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  outfile: 'out/extension.js',
  minify: prod,
});

if (prod) {
  await context.rebuild();
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(0);
} else {
  await context.watch();
}
