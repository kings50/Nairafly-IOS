import React from 'react';
import Header from './component/Header';
import Hero from './component/Hero';
import About from './component/About';
import Services from './component/Services';
import Contact from './component/Contact';
import Footer from './component/Footer';
import BackToTop from './component/BackToTop';

const page = () => {
  return (
    <div>
      <Header />
      <main>
        <Hero />
        <About />
        <Services />
        <Contact />
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
};

export default page;
