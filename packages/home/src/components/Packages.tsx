const packages = [
    {
        name: '@pendex/color',
        desc: 'Truecolor ANSI rendering with capability/degrade checks.',
    },
    {
        name: '@pendex/theme',
        desc: 'ThemeManager + swappable TOML themes, like this parchment palette.',
    },
    {
        name: '@pendex/core',
        desc: 'Shared types, ArchiveFormat, FileScanner, View, ConfigManager, bootstrap.',
    },
    {
        name: '@pendex/compile',
        desc: 'Scans a project and writes banner-delimited archives + manifest.',
    },
    {
        name: '@pendex/split',
        desc: 'Reads archives + manifest and reconstructs the original tree.',
    },
    {
        name: 'pendex',
        desc: 'The root CLI — ties every package together into one binary, px.',
    },
];

export default function Packages() {
    return (
        <section
            id='packages'
            className='px-6 py-20 bg-(--color-base-200) border-y-2 border-outline'
        >
            <div className='max-w-4xl mx-auto text-center'>
                <h2 className='font-display text-3xl sm:text-4xl text-(--color-neutral) mb-3'>
                    A Bun workspace monorepo
                </h2>
                <p className='max-w-xl mx-auto mb-12'>
                    Each package has one responsibility and depends only on the
                    layer beneath it.
                </p>

                <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-5 text-left'>
                    {packages.map(pkg => (
                        <div
                            key={pkg.name}
                            className='pendex-card p-5 flex flex-col gap-2'
                        >
                            <code
                                className='font-mono text-sm font-bold'
                                style={{ color: 'var(--color-configuration)' }}
                            >
                                {pkg.name}
                            </code>
                            <p className='text-sm leading-snug'>{pkg.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
