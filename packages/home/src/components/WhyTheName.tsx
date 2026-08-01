const mapping = [
    { math: 'Set', pendex: 'Project' },
    { math: 'Elements', pendex: 'Files' },
    {
        math: 'Power set',
        pendex: 'Complete representation of every file/group',
    },
    { math: 'Mapping', pendex: 'manifest.json' },
    { math: 'Reconstruction', pendex: 'px split' },
];

export default function WhyTheName() {
    return (
        <section className='px-6 py-20'>
            <div className='max-w-3xl mx-auto text-center'>
                <h2 className='font-display text-3xl sm:text-4xl text-(--color-neutral) mb-3'>
                    About the name
                </h2>
                <p className='leading-relaxed mb-2'>
                    Pendex comes from two sources: the mathematical notation for
                    a{' '}
                    <span
                        className='font-display italic'
                        style={{ color: 'var(--color-math)' }}
                    >
                        power set
                    </span>{' '}
                    —{' '}
                    <span
                        className='font-display italic'
                        style={{ color: 'var(--color-math)' }}
                    >
                        𝒫(A)
                    </span>
                    , the set of every subset of a set — and the Latin roots
                    behind words like <em>index</em> and <em>codex</em> ("one
                    who points out"; "book, collection").
                </p>
                <p className='leading-relaxed mb-10'>
                    Neither is literal — Pendex doesn't archive every possible
                    subset of a project's files — but the name carries that same
                    sense of <strong>totality</strong>: a complete, canonical
                    textual representation of a project that can be explored,
                    shared, and reconstructed.
                </p>

                <div className='pendex-card overflow-hidden text-left'>
                    <table className='w-full text-sm'>
                        <thead>
                            <tr className='border-b-2 border-outline'>
                                <th
                                    className='px-4 py-3 font-display text-base'
                                    style={{ color: 'var(--color-math)' }}
                                >
                                    Mathematics
                                </th>
                                <th className='px-4 py-3 font-display text-base text-(--color-neutral)'>
                                    Pendex
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {mapping.map((row, i) => (
                                <tr
                                    key={row.math}
                                    className={
                                        i < mapping.length - 1
                                            ? 'border-b border-outline/20'
                                            : ''
                                    }
                                >
                                    <td
                                        className='px-4 py-3 font-mono'
                                        style={{ color: 'var(--color-math)' }}
                                    >
                                        {row.math}
                                    </td>
                                    <td className='px-4 py-3'>{row.pendex}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
