import React from 'react';

const Services = () => {
  const serviceItems = [
    {
      num: '01',
      title: 'Branding',
      desc: 'Visual identity systems, art direction, and typography crafted to give modern businesses an unmistakable voice.',
    },
    {
      num: '02',
      title: 'UI/UX Design',
      desc: 'Human-centric digital product interfaces and intuitive user flows built on clarity, restraint, and precision.',
    },
    {
      num: '03',
      title: 'Web Design',
      desc: 'Bespoke, responsive web experiences that blend editorial storytelling with seamless front-end performance.',
    },
  ];

  return (
    <section id="services" className="services">
      <div className="container">
        <div className="services-header">
          <span className="section-index">(02) WHAT WE DO</span>
          <h2 className="section-heading">Core Disciplines</h2>
        </div>

        <div className="service-list">
          {serviceItems.map((item) => (
            <div className="service-row" key={item.num}>
              <span className="service-num">{item.num}</span>
              <h3 className="service-name">{item.title}</h3>
              <p className="service-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
