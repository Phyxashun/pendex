import React from 'react';

export interface CrossSiteLinkProps {
    href: string;
    children: React.ReactNode;
    className?: string;
    target?: '_self' | '_blank' | '_parent' | '_top';
}

const CrossSiteLink: React.FC<CrossSiteLinkProps> = ({
    href,
    children,
    className,
    target = '_self'
}) => {
    // Resolve pathing difference between Local Dev (Base: '/') and
Production (Base: '/pendex/')
    const resolvedHref = React.useMemo(() => {
        if (import.meta.env.DEV) {
            // Strip out production repo name prefixes during local development
            return href.replace(/^\/pendex/, '');
        }
        return href;
    }, [href]);

    // Only apply security attributes if we are explicitly opening in a new tab
    const relAttributes = target === '_blank' ? 'noopener noreferrer'
: undefined;

    return (
        <a
            href={resolvedHref}
            className={className}
            target={target}
            rel={relAttributes}
        >
            {children}
        </a>
    );
};

export default CrossSiteLink;
