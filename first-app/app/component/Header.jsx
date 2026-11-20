'use client';
import React, { useState, useEffect } from 'react';

const Header = () => {
  const [londonTime, setLondonTime] = useState('--:--');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setLondonTime(
        now.toLocaleTimeString('en-GB', {
          timeZone: 'Europe/London',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="header">
      <div className="container header-inner">
        <a href="#" className="brand">
          <span className="brand-dot"></span>
          AURA STUDIO
        </a>

        <div className="live-status">
          <span>LDN, UK</span>
          <span>/</span>
          <span>{londonTime}</span>
        </div>

        <nav className="nav">
          <a href="#about">About</a>
          <a href="#services">Services</a>
          <a href="#contact" className="nav-cta">
            Inquire
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Header;
