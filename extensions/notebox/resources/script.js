// Debounce delay for sending the textarea value back to the extension
const SAVE_DELAY = 100;

const debounce = (callback, wait) => {
  let timeoutId = null;
  return (...args) => {
    globalThis.clearTimeout(timeoutId);
    timeoutId = globalThis.setTimeout(() => {
      // oxlint-disable promise/prefer-await-to-callbacks
      callback(...args);
    }, wait);
  };
};

// eslint-disable-next-line no-undef
const vscode = acquireVsCodeApi();
const textarea = document.querySelector('#textarea');

const submitTextareaValue = debounce(() => {
  vscode.postMessage({
    type: 'webview->extension',
    data: textarea.value,
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Looks like VSCode doesn't support targetOrigin
  });
}, SAVE_DELAY);

textarea.addEventListener('input', () => {
  submitTextareaValue();
});

// Handle messages from the extension
window.addEventListener('message', (event) => {
  const message = event.data;
  switch (message.type) {
    // We receive the new value from the extension
    case 'extension->webview': {
      textarea.disabled = false;
      textarea.value = message.value;
      break;
    }
  }
});
