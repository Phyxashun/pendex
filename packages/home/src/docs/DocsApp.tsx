import { BannerFrame } from './BannerFrame';
import { PACKAGES } from './packages';

/**
 * Root of the whole site (home page), resolved from Vite's base URL —
 * '/pendex/' in production, '/' in dev. Both the home page and this
 * docs page now share ONE Vite base (they're one package, one build),
 * unlike the old two-package split where each app had its own base.
 */
const SITE_ROOT = import.meta.env.BASE_URL;

/** This docs page's own URL prefix, one level under the site root. */
const DOCS_BASE = `${SITE_ROOT}docs/`;

const NAV_LINKS = [
    { href: SITE_ROOT, label: 'Home' },
    { href: '#quickstart', label: 'Quickstart' },
    { href: '#packages', label: 'Packages' },
    { href: '#guide', label: 'Guide' },
    { href: `${DOCS_BASE}api/`, label: 'API Reference' },
];

export default function DocsApp() {
    return (
        <div className='min-h-screen bg-base-100 text-base-content'>
            <header className='navbar border-b border-base-300 px-4 sm:px-8 sticky top-0 bg-base-100/95 backdrop-blur z-10'>
                <div className='flex-1'>
                    <a
                        href='#top'
                        className='font-display text-lg font-bold text-primary'
                    >
                        pendex
                        <span className='text-base-content/50'>/docs</span>
                    </a>
                </div>
                <nav className='flex-none hidden sm:flex gap-1'>
                    {NAV_LINKS.map(link => (
                        <a
                            key={link.href}
                            href={link.href}
                            className='btn btn-ghost btn-sm'
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>
            </header>

            <main id='top'>
                <section className='max-w-4xl mx-auto px-4 sm:px-8 pt-16 pb-12'>
                    <BannerFrame tag='-< PENDEX >-'>
                        <h1 className='font-display text-3xl sm:text-5xl font-bold text-primary'>
                            pendex
                        </h1>
                        <p className='mt-4 text-base sm:text-lg text-base-content/80 max-w-2xl'>
                            Turns an entire source tree into portable,
                            plain-text archives — ideal for AI prompts, code
                            reviews, backups, and sharing. Compile a project
                            into banner-delimited{' '}
                            <code className='text-accent'>.txt</code> files
                            grouped by job, then reconstruct the whole tree
                            later with{' '}
                            <code className='text-accent'>px split</code>.
                        </p>
                        <div className='mt-6 flex flex-wrap gap-3'>
                            <a
                                href='#quickstart'
                                className='btn btn-primary btn-sm'
                            >
                                Get started
                            </a>
                            <a
                                href={`${DOCS_BASE}api/`}
                                className='btn btn-outline btn-sm'
                            >
                                Browse the API
                            </a>
                            <a
                                href='https://github.com/Phyxashun/pendex'
                                className='btn btn-ghost btn-sm'
                                target='_blank'
                                rel='noreferrer'
                            >
                                GitHub ↗
                            </a>
                        </div>
                    </BannerFrame>
                </section>

                <section
                    id='quickstart'
                    className='max-w-4xl mx-auto px-4 sm:px-8 py-12 border-t border-base-300'
                >
                    <h2 className='font-display text-2xl font-bold text-secondary mb-4'>
                        Quickstart
                    </h2>
                    <div className='mockup-code text-sm'>
                        <pre data-prefix='$'>
                            <code>bun add -g pendex</code>
                        </pre>
                        <pre data-prefix='$'>
                            <code>px</code>
                        </pre>
                        <pre data-prefix='>' className='text-success'>
                            <code>? Main Menu: (Use arrow keys)</code>
                        </pre>
                        <pre data-prefix='>' className='text-base-content/60'>
                            <code>❯ Compile Codebase</code>
                        </pre>
                        <pre data-prefix='>' className='text-base-content/60'>
                            <code> Split Archive</code>
                        </pre>
                        <pre data-prefix='>' className='text-base-content/60'>
                            <code> Exit Program</code>
                        </pre>
                    </div>
                    <p className='mt-4 text-sm text-base-content/70'>
                        Or run either step standalone, without the interactive
                        menu:
                    </p>
                    <div className='mockup-code text-sm mt-2'>
                        <pre data-prefix='$'>
                            <code>bun run packages/compile/src/Compile.ts</code>
                        </pre>
                        <pre data-prefix='$'>
                            <code>bun run packages/split/src/Split.ts</code>
                        </pre>
                    </div>
                </section>

                <section
                    id='packages'
                    className='max-w-4xl mx-auto px-4 sm:px-8 py-12 border-t border-base-300'
                >
                    <h2 className='font-display text-2xl font-bold text-secondary mb-2'>
                        Packages
                    </h2>
                    <p className='text-sm text-base-content/70 mb-6'>
                        Five workspace packages, each with a single
                        responsibility — click through for the full generated
                        API reference (types, classes, and functions, straight
                        from the source JSDoc comments).
                    </p>
                    <div className='grid sm:grid-cols-2 gap-4'>
                        {PACKAGES.map(pkg => (
                            <a
                                key={pkg.name}
                                href={`${DOCS_BASE}api/${pkg.apiPath}`}
                                className='card bg-base-200 border border-base-300 hover:border-primary transition-colors'
                            >
                                <div className='card-body p-5'>
                                    <h3 className='card-title font-display text-primary text-base'>
                                        {pkg.name}
                                    </h3>
                                    <p className='text-sm text-base-content/70'>
                                        {pkg.tagline}
                                    </p>
                                </div>
                            </a>
                        ))}
                    </div>
                </section>

                <section
                    id='guide'
                    className='max-w-4xl mx-auto px-4 sm:px-8 py-12 border-t border-base-300'
                >
                    <h2 className='font-display text-2xl font-bold text-secondary mb-6'>
                        Guide
                    </h2>
                    <div className='join join-vertical w-full'>
                        <GuideEntry
                            title='Compile: consolidating a project'
                            body={
                                'Compile reads config.jobs, resolves each job\u2019s include/exclude globs ' +
                                'against the current directory, and writes one banner-delimited .txt ' +
                                'per job into outputDir. A manifest.json records every consolidated file ' +
                                'and any empty directories, so split can reverse the process exactly.'
                            }
                        />
                        <GuideEntry
                            title='Split: rebuilding from an archive'
                            body={
                                'Split reads manifest.json from outputDir, parses each job\u2019s .txt ' +
                                'archive back into its original files under rebuiltDir, and recreates ' +
                                'any directories that were empty at compile time. A missing archive for ' +
                                'a job is skipped, not an error.'
                            }
                        />
                        <GuideEntry
                            title='Themes'
                            body={
                                'Themes are TOML files under a themes/ directory, named by their file ' +
                                'stem (e.g. "pendex", "dracula"). Set config.theme to the theme name you ' +
                                'want; an unknown or missing theme degrades to the built-in brand palette ' +
                                'rather than crashing.'
                            }
                        />
                        <GuideEntry
                            title='Configuration'
                            body={
                                'Defaults live in config/config.toml. A runtime.config.json in your ' +
                                'project root, if present, is merged on top the first time the config ' +
                                'loads \u2014 handy for per-project overrides without editing the shipped ' +
                                'defaults.'
                            }
                        />
                    </div>
                </section>
            </main>

            <footer className='border-t border-base-300 px-4 sm:px-8 py-8 text-center text-sm text-base-content/50'>
                <p>
                    Pendex is MIT-licensed. Full API reference generated from
                    source with{' '}
                    <a href={`${DOCS_BASE}api/`} className='link link-primary'>
                        TypeDoc
                    </a>
                    .
                </p>
            </footer>
        </div>
    );
}

/** One collapsible guide topic, rendered as a daisyUI join-collapse item. */
function GuideEntry({ title, body }: { title: string; body: string }) {
    return (
        <div className='collapse collapse-arrow join-item border border-base-300 bg-base-200'>
            <input type='checkbox' />
            <div className='collapse-title font-display text-base font-semibold text-primary'>
                {title}
            </div>
            <div className='collapse-content text-sm text-base-content/80'>
                <p>{body}</p>
            </div>
        </div>
    );
}
