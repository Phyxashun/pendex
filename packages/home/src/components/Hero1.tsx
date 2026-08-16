import polyOctopus from '../assets/png/poly-octopus-lg.png';
import CodeBlock from './CodeBlock';

const Hero = () => {
    return (
        <div className='mt-20 flex flex-col items-center
justify-between px-4 pb-20 max-md:gap-20 md:flex-row md:px-16 lg:px-24
xl:px-32'>
            {/*  */}
            <div className='flex flex-col items-center md:items-start'>
                <h1 className='font-title mb-0 max-w-xl pb-0
text-center text-5xl leading-17 text-slate-50 md:text-left md:text-6xl
md:leading-21'>
                    Pendex
                </h1>
                <p className='sm:text-md text-configuration pb-4
text-lg font-medium'>
                    Your project's portable codex.
                </p>
                <p className='mt-2 mb-10 max-w-lg min-w-xl text-center
text-base md:text-left'>
                    Turn an entire source tree into portable,
plain-text archives — ideal
                    for AI prompts, code reviews, backups, and
sharing. Compile a project
                    into banner-delimited <code>.txt</code> files
grouped by job, then
                    reconstruct the whole tree later with{' '}
                    <code className='pendex-card px-1.5 py-0.5'>px split</code>.
                </p>
                <div className='flex min-w-xl flex-col items-center'>
                    <CodeBlock
                        label='pendex'
                        lines={['bun install -g pendex', 'px compile']}
                    />

                    <div className='mt-8 flex items-center gap-4 text-base'>
                        <a
                            href='https://github.com/Phyxashun/pendex'
                            target='_blank'
                            rel='noreferrer'
                            className='btn pendex-outline-btn
border-none bg-(--color-primary) text-(--color-primary-content)
hover:bg-[--color-tan]'
                        >
                            View on GitHub
                        </a>

                        <a
                            href='#how-it-works'
                            className='btn pendex-outline-btn
border-none bg-(--color-base-100) hover:bg-(--color-base-200)'
                        >
                            See how it works
                        </a>
                    </div>
                </div>
            </div>
            {/*  */}

            <div className='relative inline-block
filter-[inset-shadow(0_0_0_5px_var(--color-accent))]'>
                <svg className='absolute h-0 w-0' aria-hidden='true'
focusable='false'>
                    <defs>
                        <filter id='remove-white-outline'>
                            {/* This morphs the alpha channel inward
by 2 pixels to chop off the white halo */}
                            <feMorphology
                                operator='erode'
                                radius='2'
                                in='SourceAlpha'
                                result='eroded'
                            />
                            <feComposite in='SourceGraphic'
in2='eroded' operator='in' />
                        </filter>
                    </defs>
                </svg>
                <img
                    src={polyOctopus}
                    width={1248}
                    height={720}
                    alt='Pendex — cursive P codex mark'
                    className='mix-blend-color-dodge
filter-[url(#remove-white-outline)] transition-all duration-300'
                />
            </div>
        </div>
    );
};

export default Hero;
