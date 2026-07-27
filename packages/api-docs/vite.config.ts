import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/guide/static-deploy
//
// GitHub Pages serves a project site (as opposed to a user/org site
// living at <user>.github.io) from https://<user>.github.io/<repo>/ —
// every asset URL Vite emits has to be prefixed with that /<repo>/
// segment in production, or the deployed page requests assets from the
// domain root and 404s.
//
// packages/home already owns the site root (base '/pendex/'), so this
// app is deployed nested one level down, at /pendex/docs/ — the combined
// deploy workflow copies this build's output into docs/ inside the
// shared Pages artifact. `base` has to match that exact serving path or
// every asset request 404s once deployed.
//
// Locally (`vite`/`vite preview`), base stays '/' so dev URLs don't
// need the prefix.
const REPO_NAME = 'pendex';
const NESTED_PATH = 'docs';

export default defineConfig(({ command }) => ({
    base: command === 'build' ? `/${REPO_NAME}/${NESTED_PATH}/` : '/',
    plugins: [react(), tailwindcss()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
}));
