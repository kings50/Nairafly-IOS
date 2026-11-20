'use client';
import React, { useState, useEffect } from 'react';

const Hero = () => {
  const words = ['Ideas', 'Brands', 'Visions', 'Stories'];
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % words.length);
        setFade(true);
      }, 350);
    }, 3200);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-main">
          <p className="eyebrow">FULL SITE UNDER CONSTRUCTION — TAKING SELECT PROJECTS</p>
          <h1 className="hero-heading">
            Bringing{' '}
            <span
              className="serif-accent"
              style={{
                opacity: fade ? 1 : 0,
                transform: fade ? 'translateY(0)' : 'translateY(6px)',
              }}
            >
              {words[index]}
            </span>{' '}
            to Life.
          </h1>
        </div>

        <div className="hero-side">
            <div className="hero-logo-box">
                <img src="/compressed_4be350b29fc969dcbfcf6620c64564c3.webp"alt="Aura Studio"className="hero-logo-img"></img></div>
          <p className="hero-lead">
            A London-based creative agency shaping modern, minimalist brand identities and digital experiences with purpose, simplicity, and elegance.
          </p>
          <div className="hero-buttons">
            <a href="#contact" className="btn-dark">
              Start a Conversation
            </a>
            <a href="#services" className="btn-link">
              View Capabilities 
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
