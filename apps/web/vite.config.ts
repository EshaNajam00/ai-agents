import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

/**
 * Strict Content Security Policy for the production build. Gridzy makes no network
 * requests, so everything is locked to the page's own origin. Dev mode is left alone
 * because Vite's hot reload needs inline scripts.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'gridzy-csp',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend',
      },
    ],
  };
}

export default defineConfig({
  // Relative asset paths, so the same build works at a sub-folder on GitHub Pages
  // (https://<user>.github.io/<repo>/) and at the root inside the Android app.
  base: './',
  plugins: [react(), contentSecurityPolicy()],
  build: {
    target: 'es2022',
    sourcemap: false,
    // PixiJS alone is ~500 kB; the game is a single offline bundle, so this is expected.
    chunkSizeWarningLimit: 800,
  },
});
