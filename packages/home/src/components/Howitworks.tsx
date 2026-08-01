import compileImg from '../assets/compile.png';
import manifestImg from '../assets/manifest.png';
import scannerImg from '../assets/scanner.png';
import splitImg from '../assets/split.png';

const steps = [
    {
        img: scannerImg,
        title: 'Scan',
        body: 'FileScanner walks the tree, honoring .gitignore plus your own excludes — finds every file, including empty directories no glob shorthand would catch.',
        accent: 'var(--color-web)',
    },
    {
        img: compileImg,
        title: 'Compile',
        body: 'Each job (source, web, style, terminal, configuration, documentation, testing, misc) gets its own banner-delimited .txt archive.',
        accent: 'var(--color-primary)',
    },
    {
        img: manifestImg,
        title: 'Manifest',
        body: 'A manifest.json records exactly what went where — the map that makes reconstruction possible.',
        accent: 'var(--color-testing)',
    },
    {
        img: splitImg,
        title: 'Split',
        body: 'px split reads the archives and the manifest, and rebuilds the original project tree on demand.',
        accent: 'var(--color-source)',
    },
];

export default function HowItWorks() {
    return (
        <section
            id='how-it-works'
            className='px-6 py-20 bg-(--color-base-200) border-y-2 border-outline'
        >
            <div className='max-w-4xl mx-auto text-center'>
                <h2 className='font-display text-3xl sm:text-4xl text-(--color-neutral) mb-3'>
                    How it works
                </h2>
                <p className='max-w-xl mx-auto mb-12'>
                    One command turns a codebase into text. One command turns it
                    back.
                </p>

                <div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-6'>
                    {steps.map((step, i) => (
                        <div
                            key={step.title}
                            className='pendex-card p-5 flex flex-col items-center gap-3 relative'
                        >
                            <span
                                className='absolute -top-3 -left-3 w-7 h-7 rounded-full border-2 border-outline flex items-center justify-center text-xs font-bold text-[#1a1a1a]'
                                style={{ background: step.accent }}
                            >
                                {i + 1}
                            </span>
                            <img src={step.img} alt='' width={56} height={56} />
                            <h3 className='font-display text-lg text-(--color-neutral)'>
                                {step.title}
                            </h3>
                            <p className='text-sm leading-snug'>{step.body}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
