import React from 'react';

const About = () => {
  return (
    <section id="about" className="about">
      <div className="container about-layout">
        <div className="label-col">
          <span className="section-index">(01) ABOUT US</span>
        </div>
        <div className="content-col">
          <h2 className="about-statement">
            Aura Studio is a London-based creative agency that helps brands express their identity through modern, minimalist design.
          </h2>
          <p className="about-body">
            Focusing on clean aesthetics, strong visuals, and storytelling through design, our goal is to make every brand we touch stand out with purpose, simplicity, and elegance.
          </p>
        </div>
      </div>
    </section>
  );
};

export default About;
