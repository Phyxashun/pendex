import heroImg from '../assets/hero.png';
import CodeBlock from './CodeBlock';

export default function Hero() {
    return (
        <section id='top' className='px-6 pt-16 pb-20 text-center'>
            <div className='max-w-3xl mx-auto flex flex-col items-center gap-6'>
                <img
                    src={heroImg}
                    alt='Pendex — cursive P codex mark'
                    width={170}
                    height={179}
                    className='drop-shadow-[3px_3px_0_rgba(0,0,0,0.15)]'
                />

                <h1 className='font-display text-5xl sm:text-6xl text-(--color-neutral)'>
                    Pendex
                </h1>

                <p className='text-xl sm:text-2xl font-medium text-configuration'>
                    Your project's portable codex.
                </p>

                <p className='max-w-xl text-base sm:text-lg leading-relaxed'>
                    Turn an entire source tree into portable, plain-text
                    archives — ideal for AI prompts, code reviews, backups, and
                    sharing. Compile a project into banner-delimited{' '}
                    <code>.txt</code> files grouped by job, then reconstruct the
                    whole tree later with{' '}
                    <code className='pendex-card px-1.5 py-0.5'>px split</code>.
                </p>

                <CodeBlock
                    label='pendex'
                    lines={['bun install -g pendex', 'px compile']}
                />

                <div className='flex flex-wrap justify-center gap-4 mt-2'>
                    <a
                        href='https://github.com/Phyxashun/pendex'
                        target='_blank'
                        rel='noreferrer'
                        className='btn pendex-outline-btn bg-(--color-primary) text-(--color-primary-content) border-none hover:bg-[#e8c56a]'
                    >
                        View on GitHub
                    </a>
                    <a
                        href='#how-it-works'
                        className='btn pendex-outline-btn bg-(--color-base-100) border-none hover:bg-(--color-base-200)'
                    >
                        See how it works
                    </a>
                </div>
            </div>
        </section>
    );
}
