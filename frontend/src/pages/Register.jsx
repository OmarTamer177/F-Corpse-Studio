import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE } from '../services/api';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    age: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      return setError('First name and last name are required');
    }

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }
    
    if (formData.password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          age: formData.age || null,
          phone: formData.phone || null
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSuccess('Registration successful! Redirecting...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = { width: '100%', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', color: 'var(--ink-solid)', font: 'inherit', padding: '12px 14px', outline: 'none' };
  const labelStyle = { display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.95rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' };

  return (
    <section style={{ padding: '60px 0 40px' }}>
      <div className="container">
        <div className="login-gate" style={{ maxWidth: '480px', margin: '0 auto', background: 'var(--paper-white)', border: '1px solid var(--line-ink)', padding: '34px' }}>
          <h2 style={{ marginBottom: '14px', fontSize: '1.5rem', letterSpacing: '0.08em' }}>CREATE ACCOUNT</h2>
          <p style={{ marginBottom: '20px' }}>Join the FCorpse platform.</p>
          
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div className="admin-field">
                <label style={labelStyle}>First Name <span style={{ color: '#9c2f25' }}>*</span></label>
                <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required maxLength="50" style={fieldStyle} />
              </div>
              <div className="admin-field">
                <label style={labelStyle}>Last Name <span style={{ color: '#9c2f25' }}>*</span></label>
                <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required maxLength="50" style={fieldStyle} />
              </div>
            </div>

            <div className="admin-field" style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Email Address <span style={{ color: '#9c2f25' }}>*</span></label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required style={fieldStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div className="admin-field">
                <label style={labelStyle}>Age</label>
                <input type="number" name="age" value={formData.age} onChange={handleChange} min="1" max="150" style={fieldStyle} />
              </div>
              <div className="admin-field">
                <label style={labelStyle}>Phone</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} maxLength="20" style={fieldStyle} />
              </div>
            </div>
            
            <div className="admin-field" style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Password <span style={{ color: '#9c2f25' }}>*</span></label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required style={fieldStyle} />
            </div>

            <div className="admin-field" style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Confirm Password <span style={{ color: '#9c2f25' }}>*</span></label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required style={fieldStyle} />
            </div>
            
            <div className="admin-actions" style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="submit" className="btn-monograph" disabled={loading}>
                {loading ? 'Creating...' : 'Sign Up'}
              </button>
              {error && <p className="admin-status error" style={{ color: '#9c2f25', fontSize: '0.9rem' }}>{error}</p>}
              {success && <p className="admin-status success" style={{ color: 'var(--green-botanical)', fontSize: '0.9rem' }}>{success}</p>}
            </div>
          </form>
          
          <div style={{ marginTop: '20px', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--ink-muted)' }}>Already have an account? </span>
            <Link to="/login" style={{ color: 'var(--ink-solid)', textDecoration: 'underline' }}>Sign in</Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Register;
