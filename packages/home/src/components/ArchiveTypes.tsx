import codeImg from '../assets/code.png';
import configImg from '../assets/config.png';
import docsImg from '../assets/docs.png';
import sourceImg from '../assets/source.png';
import styleImg from '../assets/style.png';
import terminalImg from '../assets/terminal.png';
import webImg from '../assets/web.png';

const jobs = [
    {
        name: 'Source',
        file: 'source.txt',
        img: sourceImg,
        color: 'var(--color-source)',
    },
    { name: 'Web', file: 'web.txt', img: webImg, color: 'var(--color-web)' },
    {
        name: 'Style',
        file: 'style.txt',
        img: styleImg,
        color: 'var(--color-style)',
    },
    {
        name: 'Configuration',
        file: 'config.txt',
        img: configImg,
        color: 'var(--color-configuration)',
    },
    {
        name: 'Terminal',
        file: 'terminal.txt',
        img: terminalImg,
        color: 'var(--color-terminal-cat)',
    },
    {
        name: 'Documentation',
        file: 'docs.txt',
        img: docsImg,
        color: 'var(--color-documentation)',
    },
];

export default function ArchiveTypes() {
    return (
        <section
            id='archives'
            className='px-6 py-20 bg-(--color-base-200) border-y-2 border-outline'
        >
            <div className='max-w-4xl mx-auto text-center'>
                <h2 className='font-display text-3xl sm:text-4xl text-(--color-neutral) mb-3'>
                    Grouped by job
                </h2>
                <p className='max-w-xl mx-auto mb-4'>
                    Every file lands in exactly one archive. Any job with an
                    empty <code>include</code> list becomes the remainder job —
                    it catches whatever nothing else claimed.
                </p>
                <p className='max-w-xl mx-auto mb-12 flex items-center justify-center gap-2 text-sm'>
                    <img
                        src={codeImg}
                        alt=''
                        width={20}
                        height={20}
                        className='inline-block'
                    />
                    Configured entirely in <code>config.toml</code> — no code
                    changes needed to add a job.
                </p>

                <div className='grid sm:grid-cols-2 md:grid-cols-3 gap-5'>
                    {jobs.map(job => (
                        <div
                            key={job.name}
                            className='pendex-card p-5 flex flex-col items-center gap-2 border-t-4'
                            style={{ borderTopColor: job.color }}
                        >
                            <img src={job.img} alt='' width={44} height={44} />
                            <h3 className='font-display text-base text-(--color-neutral)'>
                                {job.name}
                            </h3>
                            <code className='text-xs opacity-70'>
                                {job.file}
                            </code>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
