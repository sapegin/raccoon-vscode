Monorepo of Visual Studio Code extensions. One workspace per extension under `extensions/<id>/`.

## Extension contract

Each extension MUST:

- have a `src/extension.ts` exporting an `activate` function
- have a `package.json` with `name` matching the directory name and a `contributes`/`activationEvents` section as required by VS Code
- bundle to `out/extension.js` via `npm run build`

## Commands

```sh
npm install              # root: install all workspaces
npm run build            # build every extension
npm run dev              # esbuild watch in every extension
npm test                 # lint + build + workspace tests
npm run format           # format code
```

## When adding a new extension

1. `mkdir extensions/<id>`, and copy the structure from an existing extension.
2. Update `package.json` (`name`, `displayName`, `description`, `contributes`).
3. Add the extension to the list in [Readme.md](Readme.md).
4. Run `npm install && npm run build` to verify it bundles.
