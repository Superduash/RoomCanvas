import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './styles/globals.css';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';

// ── Narrowly-scoped console filters for uncatchable native/library logs ──
const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Cross-Origin-Opener-Policy policy would block the window.closed call.')) {
    return;
  }
  originalWarn(...args);
};

const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && (
    args[0].includes('THREE.WebGLRenderer: Context Lost.') ||
    args[0].includes('The runtime for this configuration could not be installed') ||
    args[0].includes('The specified session configuration is not supported')
  )) {
    return;
  }
  if (args[0] instanceof Error && (
    args[0].message.includes('The runtime for this configuration could not be installed') ||
    args[0].message.includes('The specified session configuration is not supported')
  )) {
    return;
  }
  originalError(...args);
};
// ───────────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    // Because we set autoUpdate in vite.config, this may not fire, 
    // but if it does, auto-refresh to get the new assets.
    updateSW(true);
  },
});
