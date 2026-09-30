import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        login(data.access_token, data.user);
        navigate('/admin');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ padding: '60px 0 40px' }}>
      <div className="container">
        <div className="login-gate" style={{ maxWidth: '420px', margin: '0 auto', background: 'var(--paper-white)', border: '1px solid var(--line-ink)', padding: '34px' }}>
          <h2 style={{ marginBottom: '14px', fontSize: '1.5rem', letterSpacing: '0.08em' }}>USER LOGIN</h2>
          <p style={{ marginBottom: '20px' }}>Sign in to continue to FCorpse.</p>
          
          <form onSubmit={handleSubmit}>
            <div className="admin-field" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.95rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', color: 'var(--ink-solid)', font: 'inherit', padding: '12px 14px', outline: 'none' }}
              />
            </div>
            
            <div className="admin-field" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.95rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', color: 'var(--ink-solid)', font: 'inherit', padding: '12px 14px', outline: 'none' }}
              />
            </div>
            
            <div className="admin-actions" style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <button type="submit" className="btn-monograph" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              {error && <p className="admin-status error" style={{ color: '#9c2f25', fontSize: '0.9rem' }}>{error}</p>}
            </div>
          </form>
          
          <div style={{ marginTop: '20px', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--ink-muted)' }}>Don't have an account? </span>
            <Link to="/register" style={{ color: 'var(--ink-solid)', textDecoration: 'underline' }}>Sign up</Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;
