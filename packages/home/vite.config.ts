import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** GitHub Pages repo name — the production site is served from /pendex/. */
const REPO_NAME = 'pendex';

// Single package, single Vite root (this directory) — no more reaching
// up into a sibling package or juggling two HTML entry points that
// live in two different workspace packages. `docs/index.html` is just
// a second page inside this same app now, so Vite's own root-relative
// dev-server routing (http://localhost:5173/docs/) and multi-page
// build (rollupOptions.input) handle it with no custom middleware.
export default defineConfig(({ command }) => ({
    base: command === 'build' ? `/${REPO_NAME}/` : '/',
    server: {
        port: 5173,
    },
    plugins: [react(), tailwindcss()],
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                docs: 'docs/index.html',
            },
        },
        outDir: 'dist',
        emptyOutDir: true,
    },
}));
