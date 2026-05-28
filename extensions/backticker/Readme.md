# Backticker Visual Studio Code extension 🐷

Visual Studio Code extension that automatically converts regular strings (single or double quotes) into template strings (backticks) when you type `${`.

[![Washing your code. A book on clean code for frontend developers](https://sapegin.me/images/washing-code-github.jpg)](https://sapegin.me/book/)

## Features

- Converts `'...'` or `"..."` to `` `...` `` when you type `${` inside the string.
- Works in JavaScript, TypeScript, JSX, and TSX.
- For JSX attribute values, also wraps the value in `{...}` so it stays valid.

## Examples

Plain JavaScript string:

```js
const greeting = 'Hello, world';
// →
const greeting = `Hello, ${name}`;
```

JSX component prop:

```jsx
<div className="Hello, world"></div>
// →
<div className={`Hello, ${name}`}></div>
```

## Changelog

The changelog can be found on the [Changelog.md](./Changelog.md) file.

## You may also like

Check out my other [Visual Studio Code extensions](https://github.com/sapegin/raccoon-vscode) and [themes](https://sapegin.me/squirrelsong/).

## Sponsoring

This software has been developed with lots of coffee, buy me one more cup to keep it going.

<a href="https://www.buymeacoffee.com/sapegin" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/lato-orange.png" alt="Buy Me A Coffee" height="51" width="217"></a>

## Contributing

Bug fixes are welcome, but not new features. Please take a moment to review the [contributing guidelines](../../Contributing.md).

## Authors and license

[Artem Sapegin](https://sapegin.me), and [contributors](https://github.com/sapegin/raccoon-vscode/graphs/contributors).

MIT License, see the included [License.md](License.md) file.
