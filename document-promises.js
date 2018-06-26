// REF: https://github.com/jonathantneal/document-promises
// thenfied document ready states
const thenify = (type, readyState) => new Promise((resolve) => {
    const listener = () => {
      if (readyState.test(document.readyState)) {
        document.removeEventListener(type, listener);
  
        resolve();
      }
    };
  
    document.addEventListener(type, listener);
  
    listener();
  });
  
  // export thenfied parsed, contentLoaded, and loaded
  const parsed = thenify('readystatechange', /^(?:interactive|complete)$/);
  const contentLoaded = thenify('DOMContentLoaded', /^(?:interactive|complete)$/);
  const loaded = thenify('readystatechange', /^complete$/);