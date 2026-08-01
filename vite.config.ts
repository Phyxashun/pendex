import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type ViteDevServer } from 'vite';

const REPO_NAME = 'pendex';

// Calculate the root directory path using pure web-standard APIs
const CURRENT_DIR = decodeURIComponent(new URL('.', import.meta.url).pathname);

// On Windows, clean up leading slash so it forms a valid Windows file path string
const ROOT_DIR = CURRENT_DIR.startsWith('/') && CURRENT_DIR.includes(':')
    ? CURRENT_DIR.slice(1)
    : CURRENT_DIR;

// Custom plugin to inject the correct asset prefixes for production builds
const productionAssetFix = () => ({
    name: 'production-asset-fix',
    transformIndexHtml(html: string, ctx: any) {
        if (ctx.bundle) {
            return html
                .replace(/href="\.\//g, `href="/${REPO_NAME}/`)
                .replace(/src="\.\//g, `src="/${REPO_NAME}/`);
        }
        return html;
    }
});

// MPA Routing middleware for local development
const mpaDevelopmentRouting = () => ({
    name: 'mpa-development-routing',
    apply: 'serve' as const,
    configureServer(server: ViteDevServer) {
        server.middlewares.use((req: any, res: any, next: any) => {
            const url = (req.url || '').split('?')[0].replace(/\/+/g, '/');

            // Route '/docs' requests to the api-docs HTML entry point
            if (url.startsWith('/docs')) {
                req.url = '/packages/api-docs/index.html';
            }
            // Route '/' or '/home' requests to the home HTML entry point
            else if (url === '/' || url.startsWith('/home')) {
                req.url = '/packages/home/index.html';
            }

            next();
        });
    }
});

export default defineConfig(({ command }) => {
    const base = command === 'build' ? `/${REPO_NAME}/` : '/';

    return {
        base,
        server: {
            port: 5173,
            fs: {
                // Allow Vite to serve files from the workspace root directory
                allow: [ROOT_DIR]
            }
        },
        plugins: [
            react(),
            tailwindcss(),
            productionAssetFix(),
            mpaDevelopmentRouting()
        ],
        build: {
            rollupOptions: {
                input: {
                    main: `${ROOT_DIR}packages/home/index.html`,
                    docs: `${ROOT_DIR}packages/api-docs/index.html`,
                },
            },
            outDir: 'dist',
            emptyOutDir: true,
        },
    };
});
