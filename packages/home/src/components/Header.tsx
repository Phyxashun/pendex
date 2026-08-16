import Logo from './Logo';
import Nav from './Nav';

const Header = () => {
    return (
        <header className="navbar border-b border-base-300 px-4
sm:px-8 sticky top-0 bg-base-100/95 backdrop-blur z-10">
            <Logo />
            <Nav />
        </header >
    );
};

export default Header;
