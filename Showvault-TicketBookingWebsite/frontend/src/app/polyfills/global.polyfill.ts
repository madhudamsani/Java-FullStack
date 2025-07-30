/**
 * This polyfill provides a global object for browser environments
 * to support Node.js modules that expect it to be available
 */

// Add global to window
(window as any).global = window;

// Some libraries might expect process.env to be available
if (!(window as any).process) {
  (window as any).process = {
    env: {}
  };
}