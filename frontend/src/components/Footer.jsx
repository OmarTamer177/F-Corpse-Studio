import React from 'react';

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top-row">
          <div>
            <p className="footer-creed">
              FCORPSE — INDEPENDENT GAME STUDIO
            </p>
          </div>

          <ul className="footer-anchors" aria-label="Footer Navigation">
            <li><a href="/#hero">Top</a></li>
            <li><a href="/#who-we-are">Identity</a></li>
            <li><a href="/#philosophy">Philosophy</a></li>
            <li><a href="/#workshop">Workshop</a></li>
            <li><a href="/services">Services</a></li>
            <li><a href="/blogs">Blog</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </div>

        <div className="footer-bottom-row">
          <span>&copy; 2026 FCorpse Game Studio.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
