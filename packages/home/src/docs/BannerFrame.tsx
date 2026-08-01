import type { ReactNode } from 'react';

/**
 * Renders text framed the way Pendex's own on-disk archive format frames
 * a file (see `packages/core/src/ArchiveFormat.ts`'s `buildBanner`) —
 * a row of cube glyphs on each side of a START/END tag. It's the one
 * signature visual element this docs site borrows directly from the
 * tool it documents, rather than inventing new chrome.
 */
export function BannerFrame({
    tag,
    children,
}: {
    tag: string;
    children: ReactNode;
}) {
    const cubes = '■'.repeat(10);

    return (
        <div className='font-display text-xs sm:text-sm'>
            <div className='text-primary/70 select-none whitespace-nowrap overflow-hidden'>
                {cubes}
                {tag}
                {cubes}
            </div>
            <div className='py-3'>{children}</div>
            <div className='text-primary/70 select-none whitespace-nowrap overflow-hidden'>
                {cubes}
                {tag}
                {cubes}
            </div>
        </div>
    );
}
