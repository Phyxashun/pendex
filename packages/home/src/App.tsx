import Architecture from './components/Architecture';
import ArchiveTypes from './components/ArchiveTypes';
import Footer from './components/Footer';
import Hero from './components/Hero';
import HowItWorks from './components/Howitworks';
import Nav from './components/Nav';
import Packages from './components/Packages';
import WhyTheName from './components/WhyTheName';

function App() {
    return (
        <div className='min-h-screen'>
            <Nav />
            <main>
                <Hero />
                <HowItWorks />
                <WhyTheName />
                <ArchiveTypes />
                <Architecture />
                <Packages />
            </main>
            <Footer />
        </div>
    );
}

export default App;
