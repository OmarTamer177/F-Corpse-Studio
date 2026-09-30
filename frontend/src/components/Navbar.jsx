import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isStaff, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = () => setMobileOpen(prev => !prev);
  const closeMobile = () => setMobileOpen(false);

  const staffAccess = isStaff || user?.is_admin || user?.role === 'admin' || user?.role === 'employee';

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand-identity" aria-label="FCorpse Studio" onClick={closeMobile}>
          <img src="/assets/icons/logo.svg" alt="FCorpse Logo" width="28" height="28" />
          <span>FCORPSE</span>
        </Link>

        {/* ── Desktop Nav ── */}
        <nav className="header-nav-desktop" aria-label="Main Navigation">
          {/* Studio Dropdown */}
          <NavDropdown label="Studio">
            <a href="/#who-we-are">Identity</a>
            <a href="/#philosophy">Philosophy</a>
            <a href="/#workshop">Workshop</a>
          </NavDropdown>

          <Link to="/services">Services</Link>
          <Link to="/blogs">Blog</Link>
          <Link to="/contact" className="btn-monograph">Contact</Link>

          {user ? (
            <NavDropdown label="Account" alignRight>
              <Link to="/dashboard">Dashboard</Link>
              {staffAccess && (
                <Link to="/admin">{isAdmin || user?.is_admin ? 'Admin Panel' : 'Staff Operations'}</Link>
              )}
              <div className="dropdown-divider" />
              <button onClick={logout}>Logout</button>
            </NavDropdown>
          ) : (
            <Link to="/login" className="btn-monograph" style={{ marginLeft: '0.5rem' }}>Login</Link>
          )}
        </nav>

        {/* ── Mobile Toggle ── */}
        <button
          className="mobile-menu-toggle"
          id="mobile-toggle"
          aria-label="Toggle Menu"
          aria-expanded={mobileOpen}
          onClick={toggleMobile}
        >
          {mobileOpen ? 'Close' : 'Menu'}
        </button>

        {/* ── Mobile Drawer ── */}
        <nav className={`mobile-nav-drawer${mobileOpen ? ' open' : ''}`} id="mobile-drawer" aria-label="Mobile Navigation">
          <span className="mobile-section-heading">Studio</span>
          <a href="/#who-we-are" className="mobile-link" onClick={closeMobile}>Identity</a>
          <a href="/#philosophy" className="mobile-link" onClick={closeMobile}>Philosophy</a>
          <a href="/#workshop" className="mobile-link" onClick={closeMobile}>Workshop</a>

          <span className="mobile-section-heading">Pages</span>
          <Link to="/services" className="mobile-link" onClick={closeMobile}>Services</Link>
          <Link to="/blogs" className="mobile-link" onClick={closeMobile}>Blog</Link>
          <Link to="/contact" className="mobile-link" onClick={closeMobile}>Contact</Link>

          {user ? (
            <>
              <span className="mobile-section-heading">Account</span>
              <Link to="/dashboard" className="mobile-link" onClick={closeMobile}>Dashboard</Link>
              {staffAccess && (
                <Link to="/admin" className="mobile-link" onClick={closeMobile}>
                  {isAdmin || user?.is_admin ? 'Admin Suite' : 'Staff Operations'}
                </Link>
              )}
              <button onClick={() => { logout(); closeMobile(); }} className="mobile-link" style={{ textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}>Logout</button>
            </>
          ) : (
            <Link to="/login" className="mobile-link" onClick={closeMobile}>Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
};

/* ── Dropdown Component ── */
const NavDropdown = ({ label, children, alignRight }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const timeout = useRef(null);

  const handleEnter = () => {
    clearTimeout(timeout.current);
    setOpen(true);
  };

  const handleLeave = () => {
    timeout.current = setTimeout(() => setOpen(false), 150);
  };

  // Close on click outside (for touch devices)
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div
      className={`nav-dropdown${open ? ' open' : ''}`}
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        className="dropdown-trigger"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        type="button"
      >
        {label}
        <span className="dropdown-arrow">▾</span>
      </button>
      <div
        className="dropdown-menu"
        style={alignRight ? { left: 'auto', right: 0, transform: open ? 'translateY(0)' : 'translateY(-8px)' } : undefined}
      >
        {children}
      </div>
    </div>
  );
};

export default Navbar;
