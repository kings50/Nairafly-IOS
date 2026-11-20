'use client';
import React, { useState, useEffect } from 'react';

const Footer = () => {
  const [year, setYear] = useState(2026);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span>&copy; {year} Aura Studio London</span>
        <span>Purpose &bull; Simplicity &bull; Elegance</span>
      </div>
    </footer>
  );
};

export default Footer;
