# File Operations 💾

Common file operations on the active file, available from the command palette.

## Commands

| Title                          | Command                        |
| ------------------------------ | ------------------------------ |
| File: Rename…                  | `fileOperations.renameFile`    |
| File: Duplicate…               | `fileOperations.duplicateFile` |
| File: Delete                   | `fileOperations.removeFile`    |
| File: Copy Name of Active File | `fileOperations.copyFileName`  |

All commands operate on the file open in the active editor.

## Language service integration

**Rename** and **Delete** go through Visual Studio Code’s `WorkspaceEdit` API, which gives language services (TypeScript, JavaScript, and others that participate in `onWillRenameFiles` / `onWillDeleteFiles`) a chance to contribute follow-up edits:

- **Rename** lets the TypeScript language server update import paths in other files that referenced the renamed file (controlled by the standard `typescript.updateImportsOnFileMove.enabled` setting).
- **Delete** opens the **Refactor Preview** panel listing every file that would be modified — typically import statements removed from dependents — which you can review and then apply or cancel. This is similar in spirit to JetBrains’ Safe Delete, although it does **not** block deletion when references exist; it only surfaces them.

## Contributing

Bug fixes are welcome, but not new features. Please take a moment to review the [contributing guidelines](../../Contributing.md).

## Authors and license

[Artem Sapegin](https://sapegin.me), and [contributors](https://github.com/sapegin/raccoon-vscode/graphs/contributors).

MIT License, see the included [License.md](License.md) file.
