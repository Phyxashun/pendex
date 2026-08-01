export default function Nav() {
    return (
        <header className='sticky top-0 z-50 border-b-2 border-outline bg-(--color-base-100)/95 backdrop-blur'>
            <nav className='max-w-5xl mx-auto flex items-center justify-between px-6 py-3'>
                <a
                    href='#top'
                    className='font-display text-2xl text-(--color-neutral)'
                >
                    𝒫endex
                </a>
                <div className='hidden sm:flex items-center gap-6 text-sm font-medium'>
                    <a
                        href='#how-it-works'
                        className='hover:text-(--color-accent) transition-colors'
                    >
                        How it works
                    </a>
                    <a
                        href='#archives'
                        className='hover:text-(--color-accent) transition-colors'
                    >
                        Archives
                    </a>
                    <a
                        href='#architecture'
                        className='hover:text-(--color-accent) transition-colors'
                    >
                        Architecture
                    </a>
                    <a
                        href='#packages'
                        className='hover:text-(--color-accent) transition-colors'
                    >
                        Packages
                    </a>
                </div>
                <a
                    href='https://github.com/Phyxashun/pendex'
                    target='_blank'
                    rel='noreferrer'
                    className='btn btn-sm pendex-outline-btn bg-(--color-neutral) text-[#f7f2e8] hover:bg-book-spine border-none'
                >
                    <svg
                        className='w-4 h-4'
                        viewBox='0 0 19 19'
                        fill='#f7f2e8'
                        aria-hidden='true'
                    >
                        <path
                            fillRule='evenodd'
                            d='M9.356 1.85C5.05 1.85 1.57 5.356 1.57 9.694a7.84 7.84 0 0 0 5.324 7.44c.387.079.528-.168.528-.376 0-.182-.013-.805-.013-1.454-2.165.467-2.616-.935-2.616-.935-.349-.91-.864-1.143-.864-1.143-.71-.48.051-.48.051-.48.787.051 1.2.805 1.2.805.695 1.194 1.817.857 2.268.649.064-.507.27-.857.49-1.052-1.728-.182-3.545-.857-3.545-3.87 0-.857.31-1.558.8-2.104-.078-.195-.349-1 .077-2.078 0 0 .657-.208 2.14.805a7.5 7.5 0 0 1 1.946-.26c.657 0 1.328.092 1.946.26 1.483-1.013 2.14-.805 2.14-.805.426 1.078.155 1.883.078 2.078.502.546.799 1.247.799 2.104 0 3.013-1.818 3.675-3.558 3.87.284.247.528.714.528 1.454 0 1.052-.012 1.896-.012 2.156 0 .208.142.455.528.377a7.84 7.84 0 0 0 5.324-7.441c.013-4.338-3.48-7.844-7.773-7.844'
                            clipRule='evenodd'
                        />
                    </svg>
                    GitHub
                </a>
            </nav>
        </header>
    );
}
