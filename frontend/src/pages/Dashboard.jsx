import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../services/api';

const Dashboard = () => {
  const { user, token, refreshUser } = useAuth();
  
  // ── Profile State ──
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    age: '',
    phone: '',
    bio: ''
  });
  const [status, setStatus] = useState({ message: '', type: '' });
  const [saving, setSaving] = useState(false);

  // ── Service Requests State ──
  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestsError, setRequestsError] = useState('');
  const [requestFilter, setRequestFilter] = useState('All');
  const [expandedRequestId, setExpandedRequestId] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        age: user.age || '',
        phone: user.phone || '',
        bio: user.bio || ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      loadMyRequests();
    }
  }, [token]);

  const loadMyRequests = async () => {
    setLoadingRequests(true);
    setRequestsError('');
    try {
      const res = await fetch(`${API_BASE}/requests/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Unable to retrieve service requests.');
      const data = await res.json();
      setMyRequests(data);
    } catch (err) {
      setRequestsError(err.message || 'Error fetching requests.');
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCancel = () => {
    setEditing(false);
    setStatus({ message: '', type: '' });
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        age: user.age || '',
        phone: user.phone || '',
        bio: user.bio || ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus({ message: 'Saving…', type: '' });

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          age: formData.age || null,
          phone: formData.phone || null,
          bio: formData.bio || null
        })
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ message: 'Profile updated successfully.', type: 'success' });
        setEditing(false);
        refreshUser();
      } else {
        setStatus({ message: data.error || 'Failed to update profile.', type: 'error' });
      }
    } catch (err) {
      setStatus({ message: 'Network error. Please try again later.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedRequestId(prev => prev === id ? null : id);
  };

  const memberSince = user ? new Date(user.created_at).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : '';

  // Filter requests
  const filteredRequests = myRequests.filter(req => {
    if (requestFilter === 'All') return true;
    return req.status.toLowerCase() === requestFilter.toLowerCase();
  });

  const getStatusBadgeClass = (statusStr) => {
    switch ((statusStr || '').toLowerCase()) {
      case 'pending': return 'badge-pending';
      case 'in review': return 'badge-in-review';
      case 'in progress': return 'badge-in-progress';
      case 'completed': return 'badge-completed';
      case 'rejected': return 'badge-rejected';
      default: return 'badge-pending';
    }
  };

  const panelStyle = { background: 'var(--paper-white)', border: '1px solid var(--line-ink)', padding: '30px' };
  const headingStyle = { fontSize: '1.5rem', letterSpacing: '0.08em', marginBottom: '18px' };
  const labelStyle = { display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.95rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' };
  const fieldStyle = { width: '100%', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', color: 'var(--ink-solid)', font: 'inherit', padding: '12px 14px', outline: 'none' };
  const infoRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 0', borderBottom: '1px solid var(--line-muted)' };
  const infoLabelStyle = { fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)' };
  const infoValueStyle = { fontSize: '1rem', color: 'var(--ink-solid)' };

  return (
    <>
      <section className="hero-section" style={{ padding: '60px 0 40px' }}>
        <div className="container">
          <span className="hero-super-line">CLIENT PORTAL</span>
          <h1 className="hero-title" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)' }}>
            {user ? `${user.first_name} ${user.last_name}` : 'DASHBOARD'}
          </h1>
        </div>
      </section>

      {/* ── Section 1: Account Information & Profile Details ── */}
      <section>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.4fr)', gap: '40px', alignItems: 'start' }}>
            
            {/* Account Information */}
            <div style={panelStyle}>
              <h2 style={headingStyle}>ACCOUNT INFORMATION</h2>

              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>Email</span>
                <span style={infoValueStyle}>{user?.email}</span>
              </div>
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>First Name</span>
                <span style={infoValueStyle}>{user?.first_name || '—'}</span>
              </div>
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>Last Name</span>
                <span style={infoValueStyle}>{user?.last_name || '—'}</span>
              </div>
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>Age</span>
                <span style={infoValueStyle}>{user?.age || '—'}</span>
              </div>
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>Phone</span>
                <span style={infoValueStyle}>{user?.phone || '—'}</span>
              </div>
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>Bio</span>
                <span style={infoValueStyle}>{user?.bio || '—'}</span>
              </div>
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>Member Since</span>
                <span style={infoValueStyle}>{memberSince}</span>
              </div>
              <div style={{ ...infoRowStyle, borderBottom: 'none' }}>
                <span style={infoLabelStyle}>Access Role</span>
                <span style={{
                  ...infoValueStyle,
                  color: (user?.role === 'admin' || user?.is_admin)
                    ? 'var(--green-botanical)'
                    : (user?.role === 'employee' ? '#c26218' : 'var(--ink-secondary)'),
                  fontWeight: 600,
                  letterSpacing: '0.03em'
                }}>
                  {user?.role === 'admin' || user?.is_admin
                    ? 'Administrator'
                    : (user?.role === 'employee' ? 'Regular Employee' : 'Client Member')}
                </span>
              </div>
            </div>

            {/* Edit Profile */}
            <div style={panelStyle}>
              <h2 style={headingStyle}>{editing ? 'EDIT PROFILE' : 'PROFILE DETAILS'}</h2>
              
              {!editing ? (
                <div>
                  <p style={{ color: 'var(--ink-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
                    Keep your contact preferences updated so our production leads can coordinate quotes, milestone updates, and deliveries with you smoothly.
                  </p>
                  <button className="btn-monograph" onClick={() => { setEditing(true); setStatus({ message: '', type: '' }); }}>
                    Edit Profile
                  </button>
                  {status.message && (
                    <p style={{ marginTop: '14px', fontSize: '0.9rem', color: status.type === 'error' ? '#9c2f25' : 'var(--green-botanical)' }}>
                      {status.message}
                    </p>
                  )}
                </div>
              ) : (
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
                    <label style={labelStyle}>Bio</label>
                    <textarea name="bio" value={formData.bio} onChange={handleChange} rows="4" style={{ ...fieldStyle, resize: 'vertical', minHeight: '100px' }}></textarea>
                  </div>

                  <div className="admin-actions" style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button type="submit" className="btn-monograph" disabled={saving}>
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button type="button" className="btn-monograph" onClick={handleCancel} style={{ background: 'transparent', color: 'var(--ink-solid)' }}>
                      Cancel
                    </button>
                    {status.message && (
                      <p style={{ fontSize: '0.9rem', flex: 1, minWidth: '160px', color: status.type === 'error' ? '#9c2f25' : 'var(--green-botanical)' }}>
                        {status.message}
                      </p>
                    )}
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ── Section Divider ── */}
      <div className="container">
        <hr className="admin-section-divider" style={{ margin: '50px 0' }} />
      </div>

      {/* ── Section 2: My Service Requests ── */}
      <section style={{ paddingBottom: '70px' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '26px' }}>
            <div>
              <span className="hero-super-line">ORDER TRACKING</span>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.2rem)', letterSpacing: '0.08em', margin: 0 }}>
                MY SERVICE REQUESTS
              </h2>
              <p style={{ color: 'var(--ink-secondary)', margin: '6px 0 0 0', fontSize: '0.95rem' }}>
                Track live status updates, review official studio quotes, and monitor progress on your project requests.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={loadMyRequests}
                className="btn-monograph" 
                style={{ background: 'transparent', color: 'var(--ink-solid)', padding: '10px 18px', fontSize: '0.85rem' }}
                title="Reload requests"
              >
                ↻ Refresh
              </button>
              <Link to="/documents" className="btn-monograph" style={{ background: 'transparent', color: 'var(--ink-solid)', padding: '10px 18px', fontSize: '0.85rem' }}>
                📁 Document Archive
              </Link>
              <Link to="/services" className="btn-monograph" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
                + Request New Service
              </Link>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '26px'
          }}>
            <div style={{ background: 'var(--paper-white)', border: '1px solid var(--line-ink)', padding: '18px 22px' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-display)', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Total Inquiries
              </span>
              <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ink-solid)' }}>
                {myRequests.length}
              </div>
            </div>

            <div style={{ background: 'var(--paper-white)', border: '1px solid var(--line-ink)', padding: '18px 22px' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-display)', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Active / In Progress
              </span>
              <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--green-botanical)' }}>
                {myRequests.filter(r => ['Pending', 'In Review', 'In Progress'].includes(r.status)).length}
              </div>
            </div>

            <div style={{ background: 'var(--paper-white)', border: '1px solid var(--line-ink)', padding: '18px 22px' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-display)', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Completed Deliveries
              </span>
              <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ink-solid)' }}>
                {myRequests.filter(r => r.status === 'Completed').length}
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="filter-toolbar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {['All', 'Pending', 'In Review', 'In Progress', 'Completed', 'Rejected'].map(statusOption => {
              const count = statusOption === 'All' 
                ? myRequests.length 
                : myRequests.filter(r => r.status.toLowerCase() === statusOption.toLowerCase()).length;
              return (
                <button
                  key={statusOption}
                  onClick={() => setRequestFilter(statusOption)}
                  className={`filter-btn ${requestFilter.toLowerCase() === statusOption.toLowerCase() ? 'active' : ''}`}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.85rem',
                    border: '1px solid var(--line-ink)',
                    background: requestFilter.toLowerCase() === statusOption.toLowerCase() ? 'var(--ink-solid)' : 'var(--paper-white)',
                    color: requestFilter.toLowerCase() === statusOption.toLowerCase() ? 'var(--paper-white)' : 'var(--ink-solid)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '0.06em'
                  }}
                >
                  {statusOption} ({count})
                </button>
              );
            })}
          </div>

          {/* Requests Content Area */}
          {loadingRequests && <p className="empty-note">Retrieving service requests…</p>}
          {requestsError && <p className="empty-note" style={{ color: '#9c2f25' }}>{requestsError}</p>}

          {!loadingRequests && !requestsError && myRequests.length === 0 && (
            <div style={{
              background: 'var(--paper-white)',
              border: '1px solid var(--line-ink)',
              padding: '50px 30px',
              textAlign: 'center'
            }}>
              <span className="hero-super-line" style={{ display: 'block', marginBottom: '8px' }}>NO SUBMISSIONS YET</span>
              <h3 style={{ fontSize: '1.4rem', letterSpacing: '0.06em', marginBottom: '10px' }}>
                YOU HAVE NOT SUBMITTED ANY SERVICE REQUESTS
              </h3>
              <p style={{ color: 'var(--ink-secondary)', maxWidth: '520px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                Explore our catalog of custom game development, art direction, audio engineering, and playtesting services to submit your first project brief.
              </p>
              <Link to="/services" className="btn-monograph">
                Browse Services & Submit Request →
              </Link>
            </div>
          )}

          {!loadingRequests && !requestsError && myRequests.length > 0 && filteredRequests.length === 0 && (
            <p className="empty-note">No service requests found matching the "{requestFilter}" filter.</p>
          )}

          {!loadingRequests && !requestsError && filteredRequests.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredRequests.map(req => {
                const isExpanded = expandedRequestId === req.id;
                return (
                  <div
                    key={req.id}
                    style={{
                      background: 'var(--paper-white)',
                      border: '1px solid var(--line-ink)',
                      padding: '24px 28px',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                    }}
                  >
                    {/* Header Row */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '14px',
                      marginBottom: '12px'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <span style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            color: 'var(--ink-muted)'
                          }}>
                            #SR-{req.id}
                          </span>
                          <span className={`request-status-badge ${getStatusBadgeClass(req.status)}`}>
                            {req.status}
                          </span>
                          <span className={`badge-priority badge-priority-${req.priority.toLowerCase()}`}>
                            {req.priority} Priority
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.25rem', letterSpacing: '0.06em', margin: 0 }}>
                          {req.service_title}
                        </h3>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                          Submitted: {new Date(req.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                        <button
                          onClick={() => toggleExpand(req.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--green-botanical)',
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.88rem',
                            letterSpacing: '0.06em',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          {isExpanded ? 'Hide Details ▲' : 'View Full Details ▼'}
                        </button>
                      </div>
                    </div>

                    {/* Excerpt / Summary */}
                    <p style={{
                      color: 'var(--ink-secondary)',
                      fontSize: '0.96rem',
                      lineHeight: 1.6,
                      margin: '8px 0 12px 0'
                    }}>
                      {isExpanded ? req.message : (req.message.length > 180 ? `${req.message.substring(0, 180)}…` : req.message)}
                    </p>

                    {/* Status Highlights */}
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '24px',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--line-muted)',
                      fontSize: '0.9rem'
                    }}>
                      {req.estimated_cost && (
                        <div>
                          <span style={{ color: 'var(--ink-muted)', display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
                            Estimated Quote
                          </span>
                          <strong style={{ color: 'var(--green-botanical)', fontSize: '1.05rem' }}>
                            {req.estimated_cost}
                          </strong>
                        </div>
                      )}

                      {req.admin_notes && (
                        <div style={{ flex: 1, minWidth: '220px' }}>
                          <span style={{ color: 'var(--ink-muted)', display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
                            Studio Progress Update
                          </span>
                          <span style={{ color: 'var(--ink-solid)', fontStyle: 'italic' }}>
                            "{req.admin_notes}"
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Expanded Inspector Drawer */}
                    {isExpanded && (
                      <div style={{
                        marginTop: '20px',
                        paddingTop: '20px',
                        borderTop: '1px solid var(--line-ink)',
                        background: 'var(--paper-surface)',
                        padding: '18px 22px'
                      }}>
                        <h4 style={{ fontSize: '0.95rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px', fontFamily: 'var(--font-display)' }}>
                          Submission Specifications
                        </h4>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.88rem', marginBottom: '16px' }}>
                          <div>
                            <span style={{ color: 'var(--ink-muted)', display: 'block' }}>Client Name:</span>
                            <strong>{req.name}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--ink-muted)', display: 'block' }}>Email Address:</span>
                            <span>{req.email}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--ink-muted)', display: 'block' }}>Phone Contact:</span>
                            <span>{req.phone || 'Not provided'}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--ink-muted)', display: 'block' }}>Organization:</span>
                            <span>{req.company || 'Individual / Independent'}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--ink-muted)', display: 'block' }}>Last Status Update:</span>
                            <span>{new Date(req.updated_at).toLocaleString()}</span>
                          </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                          <span style={{ color: 'var(--ink-muted)', display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Full Project Description:</span>
                          <div style={{
                            background: 'var(--paper-white)',
                            border: '1px solid var(--line-muted)',
                            padding: '12px 16px',
                            whiteSpace: 'pre-wrap',
                            fontSize: '0.92rem',
                            lineHeight: 1.6
                          }}>
                            {req.message}
                          </div>
                        </div>

                        {/* Attached Project Documents */}
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line-muted)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-solid)' }}>
                              Attached Files & Briefs ({req.documents?.length || 0})
                            </span>
                            <Link
                              to={`/documents?request_id=${req.id}&upload=1`}
                              style={{
                                fontSize: '0.82rem',
                                color: 'var(--green-botanical)',
                                fontFamily: 'var(--font-display)',
                                letterSpacing: '0.06em',
                                textDecoration: 'underline'
                              }}
                            >
                              + Attach File to #SR-{req.id}
                            </Link>
                          </div>

                          {(!req.documents || req.documents.length === 0) ? (
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
                              No files attached yet. You can attach design briefs, concept art, or reference audio to this request.
                            </p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {req.documents.map(doc => (
                                <div
                                  key={doc.id}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 12px',
                                    background: 'var(--paper-white)',
                                    border: '1px solid var(--line-muted)',
                                    fontSize: '0.86rem'
                                  }}
                                >
                                  <div>
                                    <strong style={{ color: 'var(--ink-solid)', marginRight: '8px' }}>{doc.title || doc.filename}</strong>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>({doc.file_size_formatted} · {doc.category})</span>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      try {
                                        const res = await fetch(`${API_BASE}/documents/${doc.id}/download`, {
                                          headers: { 'Authorization': `Bearer ${token}` }
                                        });
                                        if (res.ok) {
                                          const blob = await res.blob();
                                          const url = window.URL.createObjectURL(blob);
                                          const a = document.createElement('a');
                                          a.href = url;
                                          a.download = doc.filename;
                                          document.body.appendChild(a);
                                          a.click();
                                          document.body.removeChild(a);
                                          setTimeout(() => window.URL.revokeObjectURL(url), 60000);
                                        }
                                      } catch (err) {
                                        alert('Could not download file.');
                                      }
                                    }}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'var(--green-botanical)',
                                      fontFamily: 'var(--font-display)',
                                      letterSpacing: '0.06em',
                                      textDecoration: 'underline',
                                      cursor: 'pointer',
                                      fontSize: '0.82rem'
                                    }}
                                  >
                                    ↓ Download
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Dashboard;
