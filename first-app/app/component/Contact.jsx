'use client';
import React, { useState } from 'react';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setFormData({ name: '', email: '', message: '' });
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <section id="contact" className="contact">
      <div className="container contact-layout">
        <div className="contact-left">
          <span className="section-index">(03) CONTACT US</span>
          <h2 className="contact-heading">Have a project in mind?</h2>
          <p className="contact-sub">
            Reach out directly to our London studio while our full portfolio undergoes refinement.
          </p>

          <div className="direct-links">
            <a href="mailto:hello@aurastudio.co" className="email-link">
              hello@aurastudio.co
            </a>
            <span className="web-url">www.aurastudio.co</span>
          </div>
        </div>

        <div className="contact-right">
          <form onSubmit={handleSubmit} className="studio-form">
            <div className="input-wrap">
              <label htmlFor="client-name">Your Name</label>
              <input
                type="text"
                id="client-name"
                placeholder="Maya Daniels"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="input-wrap">
              <label htmlFor="client-email">Email Address</label>
              <input
                type="email"
                id="client-email"
                placeholder="hello@aurastudio.co"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="input-wrap">
              <label htmlFor="client-message">Project Brief</label>
              <textarea
                id="client-message"
                rows="4"
                placeholder="Tell us about your brand, timeline, and goals..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
              ></textarea>
            </div>

            <button type="submit" className="btn-submit">
              Send Inquiry
            </button>

            {submitted && (
              <div className="status-banner">
                Message received. Our team at Aura Studio will get back to you shortly.
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};

export default Contact;

