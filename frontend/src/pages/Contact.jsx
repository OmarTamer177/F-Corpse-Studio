import React, { useState } from 'react';
import { API_BASE } from '../services/api';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Sending...');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (res.ok) {
        setStatus('Your message has been successfully submitted!');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setStatus(data.error || 'Failed to send message.');
      }
    } catch (err) {
      setStatus('Network error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="contact-hero">
        <div className="container">
          <span className="hero-super-line">04 — OPEN CHANNEL</span>
          <h1 className="contact-title">LET'S BUILD<br /><span>ANOTHER WORLD.</span></h1>
          <p className="hero-editorial-lead">Have a question, a collaboration in mind, or simply want to say hello? Leave us a note. Every message is read by the humans in the workshop.</p>
        </div>
      </section>

      <section className="contact-section">
        <div className="container contact-layout">
          <div className="contact-intro">
            <span className="section-datum">CONTACT / INQUIRY</span>
            <h2>START A CONVERSATION.</h2>
            <p>Tell us what is on your mind and we will get back to you as soon as we can.</p>
            <div className="contact-note">
              <strong>THE STUDIO</strong>
              <span>Independent game development<br />Built with patience and intent.</span>
            </div>
          </div>

          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="name">Name <span>*</span></label>
              <input id="name" name="name" type="text" maxLength="100" required value={formData.name} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label htmlFor="email">Email <span>*</span></label>
              <input id="email" name="email" type="email" maxLength="120" required value={formData.email} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label htmlFor="subject">Subject <span>*</span></label>
              <input id="subject" name="subject" type="text" maxLength="200" required value={formData.subject} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label htmlFor="message">Message <span>*</span></label>
              <textarea id="message" name="message" rows="7" required value={formData.message} onChange={handleChange}></textarea>
            </div>
            <div className="form-actions">
              <button className="btn-monograph form-submit" type="submit" disabled={loading}>Send inquiry</button>
              {status && <p className="form-status" style={{ marginTop: '10px' }}>{status}</p>}
            </div>
          </form>
        </div>
      </section>
    </>
  );
};

export default Contact;
