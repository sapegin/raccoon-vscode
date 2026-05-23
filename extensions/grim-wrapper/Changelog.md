# Changelog

## 1.2.2

- Fix formatting of `/* *` and `{/* */}` comments.

## 1.2.1

- Correctly detect comment boundaries.

## 1.2.0

- [Simpler multiline comment formatting: only add `*` prefixes for JSDoc (`/**` comments), and indent `/*` and JSX comments using two spaces instead](https://github.com/sapegin/grim-wrapper/commit/73a03a7971b31c0b6a818ca626ccbc6b80513c2e)
- Improve wrapping of comments with very long words

## 1.1.0

- [Change formatting of JSX comments](https://github.com/sapegin/grim-wrapper/commit/0fffbb90402ccd3f9720ea0a125d9dbe58797f29).

## 1.0.6

- Skip wrapping short comments only when they are single-line.

## 1.0.6

- Correct indentation in multiline `{/* ... */}` comments.

## 1.0.5

- Skip document update if there was no changes to the text.

## 1.0.4

- Don't publish unnecessary files with the extension.

## 1.0.3

- Support HTML comments.
- Support ordered lists.
- Support nested lists.
- Treat `TODO:` and other such markers as new paragraph to avoid squishing them into a single line. However, don't indent them like JSDoc (`@todo`).

## 1.0.2

- Fix condition to detect paragraph breaks.

## 1.0.1

- Fix comment edges detection for single-line comments.

## 1.0.0

First version.
