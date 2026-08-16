import pendexSvg from '../assets/svg/favicon.svg';

/**
 * Prefix every internal link needs so it resolves under
 * GitHub Pages' /pendex/ base path in production.
 */
export const BASE = import.meta.env.BASE_URL;

/**
 * Root of the site this app is nested under (packages/home),
 * one level up from BASE.
 */
export const SITE_ROOT = BASE.replace(/docs\/?$/, '');

const Logo = () => {
    return (
        <div className="flex-1">
            <a href={SITE_ROOT} className="font-display text-2xl text-primary">
                <div className="flex flex-row">
                    <img src={pendexSvg} alt="Pendex" className="w-8 h-8" />
                    endex<span className="text-base-content/50">/core</span>
                </div>
            </a>
        </div>
    );
};

export default Logo;
