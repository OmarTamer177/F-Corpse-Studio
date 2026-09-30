import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../services/api';

const Admin = () => {
  const { user, token, isAdmin, isEmployee, role } = useAuth();

  // ── Services State ──
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [errorServices, setErrorServices] = useState('');
  const [serviceForm, setServiceForm] = useState({ id: '', title: '', description: '', icon: '', price: '' });
  const [serviceFormStatus, setServiceFormStatus] = useState({ message: '', type: '' });
  const [isSubmittingService, setIsSubmittingService] = useState(false);

  // ── Blog State ──
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [errorPosts, setErrorPosts] = useState('');
  const [formData, setFormData] = useState({ id: '', title: '', author: '', content: '' });
  const [formStatus, setFormStatus] = useState({ message: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Customer Requests State ──
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [errorRequests, setErrorRequests] = useState('');
  const [requestStats, setRequestStats] = useState({
    total: 0, pending: 0, in_review: 0, in_progress: 0, completed: 0, rejected: 0, urgent: 0
  });
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    status: '',
    priority: '',
    admin_notes: '',
    estimated_cost: ''
  });
  const [savingRequest, setSavingRequest] = useState(false);
  const [requestActionStatus, setRequestActionStatus] = useState({ message: '', type: '' });

  // ── Team & Role Management State ──
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userRoleStatus, setUserRoleStatus] = useState({ message: '', type: '' });
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'employee',
    phone: '',
    bio: ''
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState('');

  useEffect(() => {
    loadServices();
    loadPosts();
    if (token) {
      loadRequests();
      loadRequestStats();
      if (isAdmin) {
        loadUsersList();
      }
    }
  }, [token, isAdmin]);

  const loadUsersList = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_BASE}/auth/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch(`${API_BASE}/auth/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role.');
      setUserRoleStatus({ message: data.message || 'Role updated successfully.', type: 'success' });
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole, is_admin: newRole === 'admin' } : u));
    } catch (err) {
      setUserRoleStatus({ message: err.message, type: 'error' });
    }
  };

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    setCreateUserError('');
    try {
      const res = await fetch(`${API_BASE}/auth/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUserForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create team member.');
      setUserRoleStatus({ message: data.message || 'Team member onboarded successfully.', type: 'success' });
      setUsersList(prev => [...prev, data.user]);
      setCreateUserModalOpen(false);
      setNewUserForm({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: 'employee',
        phone: '',
        bio: ''
      });
    } catch (err) {
      setCreateUserError(err.message);
    } finally {
      setCreatingUser(false);
    }
  };

  // ── Service Handlers ──

  const loadServices = async () => {
    setLoadingServices(true);
    try {
      const res = await fetch(`${API_BASE}/services`);
      if (!res.ok) throw new Error('Unable to load services.');
      const data = await res.json();
      setServices(data);
      setErrorServices('');
    } catch (err) {
      setErrorServices('Could not reach the API.');
    } finally {
      setLoadingServices(false);
    }
  };

  const handleServiceChange = (e) => {
    setServiceForm({ ...serviceForm, [e.target.name]: e.target.value });
  };

  const handleServiceEdit = (service) => {
    setServiceForm({
      id: service.id,
      title: service.title,
      description: service.description,
      icon: service.icon || '',
      price: service.price || ''
    });
    setServiceFormStatus({ message: '', type: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleServiceCancelEdit = () => {
    setServiceForm({ id: '', title: '', description: '', icon: '', price: '' });
    setServiceFormStatus({ message: '', type: '' });
  };

  const handleServiceDelete = async (id) => {
    if (!window.confirm('Delete this service? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE}/services/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unable to delete service.');
      loadServices();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingService(true);
    setServiceFormStatus({ message: 'Saving…', type: '' });

    const payload = {
      title: serviceForm.title.trim(),
      description: serviceForm.description.trim(),
      icon: serviceForm.icon.trim(),
      price: serviceForm.price.trim()
    };

    try {
      const res = await fetch(`${API_BASE}/services${serviceForm.id ? '/' + serviceForm.id : ''}`, {
        method: serviceForm.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unable to save service.');

      setServiceFormStatus({ message: serviceForm.id ? 'Service updated.' : 'Service created.', type: 'success' });
      setServiceForm({ id: '', title: '', description: '', icon: '', price: '' });
      loadServices();
    } catch (err) {
      setServiceFormStatus({ message: err.message, type: 'error' });
    } finally {
      setIsSubmittingService(false);
    }
  };

  // ── Blog Handlers ──

  const loadPosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await fetch(`${API_BASE}/blogs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Unable to load posts.');
      const data = await res.json();
      setPosts(data);
      setErrorPosts('');
    } catch (err) {
      setErrorPosts('Could not reach the API.');
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEdit = (post) => {
    setFormData({ id: post.id, title: post.title, author: post.author || '', content: post.content });
    setFormStatus({ message: '', type: '' });
  };

  const handleCancelEdit = () => {
    setFormData({ id: '', title: '', author: '', content: '' });
    setFormStatus({ message: '', type: '' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE}/blogs/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unable to delete post.');
      loadPosts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormStatus({ message: 'Saving…', type: '' });

    const payload = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      author: formData.author.trim() || undefined
    };

    try {
      const res = await fetch(`${API_BASE}/blogs${formData.id ? '/' + formData.id : ''}`, {
        method: formData.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unable to save post.');

      setFormStatus({ message: formData.id ? 'Post updated.' : 'Post created.', type: 'success' });
      setFormData({ id: '', title: '', author: '', content: '' });
      loadPosts();
    } catch (err) {
      setFormStatus({ message: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Customer Requests Handlers ──

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch(`${API_BASE}/requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Unable to load customer requests.');
      const data = await res.json();
      setRequests(data);
      setErrorRequests('');
    } catch (err) {
      setErrorRequests(err.message || 'Could not fetch requests.');
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadRequestStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/requests/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequestStats(data);
      }
    } catch (err) {
      console.error('Failed to load request stats', err);
    }
  };

  const handleQuickStatusChange = async (requestId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || 'Failed to update status.');

      // Update in state
      setRequests(prev => prev.map(r => r.id === requestId ? updated : r));
      if (selectedRequest && selectedRequest.id === requestId) {
        setSelectedRequest(updated);
        setEditForm(prev => ({ ...prev, status: newStatus }));
      }
      loadRequestStats();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleInspectRequest = (req) => {
    setSelectedRequest(req);
    setEditForm({
      status: req.status,
      priority: req.priority,
      admin_notes: req.admin_notes || '',
      estimated_cost: req.estimated_cost || ''
    });
    setRequestActionStatus({ message: '', type: '' });
    setInspectModalOpen(true);
  };

  const closeInspectModal = () => {
    setInspectModalOpen(false);
    setSelectedRequest(null);
    setRequestActionStatus({ message: '', type: '' });
  };

  const handleSaveInspectChanges = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setSavingRequest(true);
    setRequestActionStatus({ message: 'Saving…', type: '' });

    try {
      const res = await fetch(`${API_BASE}/requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: editForm.status,
          priority: editForm.priority,
          admin_notes: editForm.admin_notes.trim() || null,
          estimated_cost: editForm.estimated_cost.trim() || null
        })
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || 'Failed to save changes.');

      setSelectedRequest(updated);
      setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
      setRequestActionStatus({ message: 'Request updated successfully.', type: 'success' });
      loadRequestStats();
    } catch (err) {
      setRequestActionStatus({ message: err.message, type: 'error' });
    } finally {
      setSavingRequest(false);
    }
  };

  const handleDeleteRequest = async (id) => {
    if (!window.confirm(`Delete request #SR-${id}? This action is permanent.`)) return;
    try {
      const res = await fetch(`${API_BASE}/requests/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unable to delete request.');

      if (inspectModalOpen && selectedRequest?.id === id) {
        closeInspectModal();
      }
      setRequests(prev => prev.filter(r => r.id !== id));
      loadRequestStats();
    } catch (err) {
      alert(err.message);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(req => {
    if (statusFilter !== 'All' && req.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (priorityFilter !== 'All' && req.priority.toLowerCase() !== priorityFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        (req.name || '').toLowerCase().includes(q) ||
        (req.email || '').toLowerCase().includes(q) ||
        (req.company || '').toLowerCase().includes(q) ||
        (req.service_title || '').toLowerCase().includes(q) ||
        (req.message || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
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

  const truncate = (text, max) => (text && text.length > max) ? text.slice(0, max).trim() + '…' : text;

  // ── Shared Inline Styles ──
  const panelStyle = { background: 'var(--paper-white)', border: '1px solid var(--line-ink)', padding: '30px' };
  const headingStyle = { fontSize: '1.5rem', letterSpacing: '0.08em', marginBottom: '18px' };
  const labelStyle = { display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.95rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' };
  const inputStyle = { width: '100%', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', color: 'var(--ink-solid)', font: 'inherit', padding: '12px 14px', outline: 'none' };
  const cardStyle = { border: '1px solid var(--line-muted)', background: 'var(--paper-white)', padding: '18px 20px' };
  const btnStyle = { fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid var(--line-ink)', background: 'transparent', padding: '6px 14px', cursor: 'pointer' };

  return (
    <>
      {/* Hero */}
      <section className="hero-section" id="hero" style={{ padding: '60px 0 40px' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <span className="hero-super-line">
                {isAdmin ? 'ADMIN CONTROL SUITE' : 'OPERATIONS DISPATCH CONSOLE'}
              </span>
              <h1 className="hero-title" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)' }}>
                {isAdmin ? 'STUDIO MANAGEMENT' : 'REQUEST OPERATIONS'}
              </h1>
            </div>

            <div style={{
              background: 'var(--paper-white)',
              border: '1px solid var(--line-ink)',
              padding: '16px 22px',
              maxWidth: '380px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: isAdmin ? 'var(--green-botanical)' : '#d97706'
                }}></span>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.85rem',
                  letterSpacing: '0.08em',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: isAdmin ? 'var(--green-botanical)' : '#d97706'
                }}>
                  {isAdmin ? 'ROLE: ADMINISTRATOR' : 'ROLE: REGULAR EMPLOYEE'}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', margin: 0, lineHeight: 1.5 }}>
                {isAdmin
                  ? 'Full administrative privileges: manage service catalog, publish blogs, review, update and delete customer requests, and assign user roles.'
                  : 'Operational access: search, filter, review, and update customer service requests. Deleting records and catalog management are restricted to Administrator.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          01 — SERVICES MANAGEMENT
          ═══════════════════════════════════════════════ */}
      <section>
        <div className="container">
          <div className="admin-section-header">
            <span className="section-datum">01 — SERVICES</span>
          </div>

          <div className="admin-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.4fr)', gap: '50px', alignItems: 'start' }}>
            {/* Service Form or Employee Notice */}
            <div className="admin-panel" style={panelStyle}>
              {isAdmin ? (
                <>
                  <h2 style={headingStyle}>
                    {serviceForm.id ? 'EDIT SERVICE' : 'NEW SERVICE'}
                  </h2>

                  <form onSubmit={handleServiceSubmit}>
                    <div className="admin-field" style={{ marginBottom: '20px' }}>
                      <label htmlFor="svc-title" style={labelStyle}>Title *</label>
                      <input id="svc-title" name="title" type="text" maxLength="200" required value={serviceForm.title} onChange={handleServiceChange} style={inputStyle} />
                    </div>

                    <div className="admin-field" style={{ marginBottom: '20px' }}>
                      <label htmlFor="svc-description" style={labelStyle}>Description *</label>
                      <textarea id="svc-description" name="description" required value={serviceForm.description} onChange={handleServiceChange} style={{ ...inputStyle, resize: 'vertical', minHeight: '140px' }}></textarea>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                      <div className="admin-field">
                        <label htmlFor="svc-icon" style={labelStyle}>Icon (emoji)</label>
                        <input id="svc-icon" name="icon" type="text" maxLength="50" value={serviceForm.icon} onChange={handleServiceChange} style={inputStyle} placeholder="e.g. 🎮" />
                      </div>
                      <div className="admin-field">
                        <label htmlFor="svc-price" style={labelStyle}>Price</label>
                        <input id="svc-price" name="price" type="text" maxLength="100" value={serviceForm.price} onChange={handleServiceChange} style={inputStyle} placeholder="e.g. Contact Us" />
                      </div>
                    </div>

                    <div className="admin-actions" style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button type="submit" className="btn-monograph" disabled={isSubmittingService}>
                        {serviceForm.id ? 'Update Service' : 'Add Service'}
                      </button>
                      {serviceForm.id && (
                        <button type="button" className="btn-monograph" onClick={handleServiceCancelEdit} style={{ background: 'transparent', color: 'var(--ink-solid)' }}>
                          Cancel
                        </button>
                      )}
                      <p style={{ fontSize: '0.9rem', flex: 1, minWidth: '160px', color: serviceFormStatus.type === 'error' ? '#9c2f25' : 'var(--green-botanical)' }}>
                        {serviceFormStatus.message}
                      </p>
                    </div>
                  </form>
                </>
              ) : (
                <div>
                  <h2 style={headingStyle}>CATALOG SPECIFICATIONS</h2>
                  <div style={{ padding: '24px', border: '1px dashed var(--line-muted)', background: 'var(--paper-surface)' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.08em', color: '#d97706', marginBottom: '10px', textTransform: 'uppercase', fontWeight: 600 }}>
                      🔒 Administrator Clearance Required
                    </div>
                    <p style={{ fontSize: '0.92rem', color: 'var(--ink-secondary)', lineHeight: 1.6, margin: 0 }}>
                      As a Regular Employee, you have read-only access to studio service packages for quote reference when evaluating customer requests. Adding, modifying, or deleting service offerings is restricted to Administrators.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Service List */}
            <div className="admin-panel" style={panelStyle}>
              <h2 style={headingStyle}>EXISTING SERVICES</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {loadingServices && <p className="empty-note">Loading…</p>}
                {errorServices && <p className="empty-note">{errorServices}</p>}

                {!loadingServices && !errorServices && services.length === 0 && (
                  <p className="empty-note">No services yet.</p>
                )}

                {!loadingServices && !errorServices && services.map(service => (
                  <div key={service.id} style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '1.15rem', letterSpacing: '0.06em', margin: 0 }}>
                        {service.icon ? `${service.icon} ` : ''}{service.title}
                      </h3>
                      {service.price && (
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'var(--green-botanical)', textTransform: 'uppercase' }}>
                          {service.price}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.95rem', color: 'var(--ink-secondary)', marginBottom: '14px', lineHeight: 1.6 }}>
                      {truncate(service.description, 180)}
                    </p>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {isAdmin ? (
                        <>
                          <button onClick={() => handleServiceEdit(service)} style={btnStyle}>Edit</button>
                          <button onClick={() => handleServiceDelete(service.id)} style={btnStyle}>Delete</button>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
                          Reference Only (Catalog Locked)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div className="container">
        <hr className="admin-section-divider" />
      </div>

      {/* ═══════════════════════════════════════════════
          02 — BLOG POSTS MANAGEMENT
          ═══════════════════════════════════════════════ */}
      <section>
        <div className="container">
          <div className="admin-section-header">
            <span className="section-datum">02 — BLOG POSTS</span>
          </div>

          <div id="admin-app" className="ready" style={{ display: 'block' }}>
            <div className="admin-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.4fr)', gap: '50px', alignItems: 'start' }}>
              
              <div className="admin-panel" style={panelStyle}>
                {isAdmin ? (
                  <>
                    <h2 style={headingStyle}>
                      {formData.id ? 'EDIT POST' : 'NEW POST'}
                    </h2>
                    
                    <form onSubmit={handleSubmit}>
                      <div className="admin-field" style={{ marginBottom: '20px' }}>
                        <label htmlFor="title" style={labelStyle}>Title *</label>
                        <input id="title" name="title" type="text" maxLength="200" required value={formData.title} onChange={handleChange} style={inputStyle} />
                      </div>
                      
                      <div className="admin-field" style={{ marginBottom: '20px' }}>
                        <label htmlFor="author" style={labelStyle}>Author</label>
                        <input id="author" name="author" type="text" maxLength="100" value={formData.author} onChange={handleChange} style={inputStyle} />
                      </div>
                      
                      <div className="admin-field" style={{ marginBottom: '20px' }}>
                        <label htmlFor="content" style={labelStyle}>Content *</label>
                        <textarea id="content" name="content" required value={formData.content} onChange={handleChange} style={{ ...inputStyle, resize: 'vertical', minHeight: '200px' }}></textarea>
                      </div>
                      
                      <div className="admin-actions" style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button type="submit" className="btn-monograph" disabled={isSubmitting}>{formData.id ? 'Update' : 'Publish'}</button>
                        {formData.id && (
                          <button type="button" className="btn-monograph" onClick={handleCancelEdit} style={{ background: 'transparent', color: 'var(--ink-solid)' }}>Cancel</button>
                        )}
                        <p className={`admin-status ${formStatus.type === 'error' ? 'error' : 'success'}`} style={{ fontSize: '0.9rem', flex: 1, minWidth: '160px', color: formStatus.type === 'error' ? '#9c2f25' : 'var(--green-botanical)' }}>{formStatus.message}</p>
                      </div>
                    </form>
                  </>
                ) : (
                  <div>
                    <h2 style={headingStyle}>STUDIO DISPATCHES</h2>
                    <div style={{ padding: '24px', border: '1px dashed var(--line-muted)', background: 'var(--paper-surface)' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.08em', color: '#d97706', marginBottom: '10px', textTransform: 'uppercase', fontWeight: 600 }}>
                        🔒 Administrator Clearance Required
                      </div>
                      <p style={{ fontSize: '0.92rem', color: 'var(--ink-secondary)', lineHeight: 1.6, margin: 0 }}>
                        Publishing and deleting official studio dispatches and editorial releases requires Administrator role clearance. Staff employees may browse published posts as reference.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="admin-panel" style={panelStyle}>
                <h2 style={headingStyle}>EXISTING POSTS</h2>
                <div className="post-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {loadingPosts && <p className="empty-note">Loading…</p>}
                  {errorPosts && <p className="empty-note">{errorPosts}</p>}
                  
                  {!loadingPosts && !errorPosts && posts.length === 0 && (
                    <p className="empty-note">No posts yet.</p>
                  )}

                  {!loadingPosts && !errorPosts && posts.map(post => (
                    <div key={post.id} className="post-card" style={cardStyle}>
                      <div className="post-card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '1.15rem', letterSpacing: '0.06em' }}>{post.title}</h3>
                      </div>
                      <div className="post-card-meta" style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', marginBottom: '10px' }}>
                        {new Date(post.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        {post.author ? ` · ${post.author}` : ''}
                      </div>
                      <div className="post-card-excerpt" style={{ fontSize: '0.95rem', color: 'var(--ink-secondary)', marginBottom: '14px', whiteSpace: 'pre-wrap' }}>
                        {truncate(post.content, 220)}
                      </div>
                      <div className="post-card-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {isAdmin ? (
                          <>
                            <button onClick={() => handleEdit(post)} style={btnStyle}>Edit</button>
                            <button onClick={() => handleDelete(post.id)} style={btnStyle}>Delete</button>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
                            Reference Only
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div className="container">
        <hr className="admin-section-divider" />
      </div>

      {/* ═══════════════════════════════════════════════
          03 — CUSTOMER REQUESTS MANAGEMENT
          ═══════════════════════════════════════════════ */}
      <section style={{ paddingBottom: '90px' }} id="section-customer-requests">
        <div className="container">
          <div className="admin-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <span className="section-datum">03 — CUSTOMER REQUESTS</span>
            <button
              onClick={() => { loadRequests(); loadRequestStats(); }}
              className="btn-monograph"
              style={{ background: 'transparent', color: 'var(--ink-solid)', fontSize: '0.85rem', padding: '8px 18px' }}
              title="Refresh requests"
            >
              ↻ Refresh Live Requests
            </button>
          </div>

          {/* ── KPI Summary Cards ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px',
            marginBottom: '30px'
          }}>
            <div style={{ background: 'var(--paper-white)', border: '1px solid var(--line-ink)', padding: '20px' }}>
              <span style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-display)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                TOTAL REQUESTS
              </span>
              <div style={{ fontSize: '2.2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ink-solid)' }}>
                {requestStats.total}
              </div>
            </div>

            <div style={{ background: 'var(--paper-white)', border: '1px solid #b47818', padding: '20px' }}>
              <span style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-display)', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#b47818', fontWeight: 700 }}>
                PENDING REVIEW
              </span>
              <div style={{ fontSize: '2.2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#b47818' }}>
                {requestStats.pending}
              </div>
            </div>

            <div style={{ background: 'var(--paper-white)', border: '1px solid #2b6cb0', padding: '20px' }}>
              <span style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-display)', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#2b6cb0', fontWeight: 700 }}>
                IN REVIEW
              </span>
              <div style={{ fontSize: '2.2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#2b6cb0' }}>
                {requestStats.in_review}
              </div>
            </div>

            <div style={{ background: 'var(--paper-white)', border: '1px solid #6b46c1', padding: '20px' }}>
              <span style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-display)', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b46c1', fontWeight: 700 }}>
                IN PROGRESS
              </span>
              <div style={{ fontSize: '2.2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#6b46c1' }}>
                {requestStats.in_progress}
              </div>
            </div>

            <div style={{ background: 'var(--paper-white)', border: '1px solid var(--green-botanical)', padding: '20px' }}>
              <span style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-display)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--green-botanical)', fontWeight: 700 }}>
                COMPLETED
              </span>
              <div style={{ fontSize: '2.2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--green-botanical)' }}>
                {requestStats.completed}
              </div>
            </div>

            <div style={{ background: 'var(--paper-white)', border: '1px solid #9c2f25', padding: '20px' }}>
              <span style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-display)', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9c2f25', fontWeight: 700 }}>
                REJECTED
              </span>
              <div style={{ fontSize: '2.2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#9c2f25' }}>
                {requestStats.rejected}
              </div>
            </div>
          </div>

          {/* ── Filters & Search Toolbar ── */}
          <div style={{
            background: 'var(--paper-white)',
            border: '1px solid var(--line-ink)',
            padding: '20px 24px',
            marginBottom: '24px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '18px'
          }}>
            {/* Status Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['All', 'Pending', 'In Review', 'In Progress', 'Completed', 'Rejected'].map(statusName => {
                const count = statusName === 'All'
                  ? requests.length
                  : requests.filter(r => r.status.toLowerCase() === statusName.toLowerCase()).length;
                const isActive = statusFilter.toLowerCase() === statusName.toLowerCase();
                return (
                  <button
                    key={statusName}
                    onClick={() => setStatusFilter(statusName)}
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.84rem',
                      fontFamily: 'var(--font-display)',
                      letterSpacing: '0.06em',
                      border: '1px solid var(--line-ink)',
                      background: isActive ? 'var(--ink-solid)' : 'var(--paper-surface)',
                      color: isActive ? 'var(--paper-white)' : 'var(--ink-solid)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {statusName} ({count})
                  </button>
                );
              })}
            </div>

            {/* Priority & Search Inputs */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end', minWidth: '280px' }}>
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--line-muted)',
                  background: 'var(--paper-surface)',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.85rem',
                  letterSpacing: '0.06em',
                  color: 'var(--ink-solid)',
                  outline: 'none'
                }}
              >
                <option value="All">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>

              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search requests by name, client, service..."
                style={{
                  padding: '8px 14px',
                  border: '1px solid var(--line-muted)',
                  background: 'var(--paper-surface)',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                  color: 'var(--ink-solid)',
                  width: '260px',
                  outline: 'none'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--ink-muted)',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* ── Requests Table / List ── */}
          <div style={panelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ ...headingStyle, marginBottom: 0 }}>
                CUSTOMER REQUESTS DISPATCH ({filteredRequests.length})
              </h2>
            </div>

            {loadingRequests && <p className="empty-note">Loading customer requests…</p>}
            {errorRequests && <p className="empty-note" style={{ color: '#9c2f25' }}>{errorRequests}</p>}

            {!loadingRequests && !errorRequests && filteredRequests.length === 0 && (
              <p className="empty-note">
                No customer requests match your current filters.
              </p>
            )}

            {!loadingRequests && !errorRequests && filteredRequests.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  fontSize: '0.92rem'
                }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--line-ink)', fontFamily: 'var(--font-display)', fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                      <th style={{ padding: '12px 14px' }}>Ref #</th>
                      <th style={{ padding: '12px 14px' }}>Date</th>
                      <th style={{ padding: '12px 14px' }}>Customer / Client</th>
                      <th style={{ padding: '12px 14px' }}>Service Requested</th>
                      <th style={{ padding: '12px 14px' }}>Priority</th>
                      <th style={{ padding: '12px 14px' }}>Status</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map(req => (
                      <tr
                        key={req.id}
                        style={{
                          borderBottom: '1px solid var(--line-muted)',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        {/* Ref ID */}
                        <td style={{ padding: '14px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--ink-muted)' }}>
                          #SR-{req.id}
                        </td>

                        {/* Date */}
                        <td style={{ padding: '14px', whiteSpace: 'nowrap', color: 'var(--ink-secondary)', fontSize: '0.85rem' }}>
                          {new Date(req.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>

                        {/* Customer */}
                        <td style={{ padding: '14px' }}>
                          <strong style={{ display: 'block', color: 'var(--ink-solid)' }}>{req.name}</strong>
                          <span style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>{req.email}</span>
                          {req.company && (
                            <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--green-botanical)' }}>
                              {req.company}
                            </span>
                          )}
                        </td>

                        {/* Service Title & Excerpt */}
                        <td style={{ padding: '14px', maxWidth: '260px' }}>
                          <strong style={{ display: 'block', color: 'var(--ink-solid)', marginBottom: '2px' }}>
                            {req.service_title}
                          </strong>
                          <span style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {req.message}
                          </span>
                        </td>

                        {/* Priority */}
                        <td style={{ padding: '14px' }}>
                          <span className={`badge-priority badge-priority-${req.priority.toLowerCase()}`}>
                            {req.priority}
                          </span>
                        </td>

                        {/* Status (Quick Selector) */}
                        <td style={{ padding: '14px' }}>
                          <select
                            value={req.status}
                            onChange={(e) => handleQuickStatusChange(req.id, e.target.value)}
                            style={{
                              padding: '5px 8px',
                              fontFamily: 'var(--font-display)',
                              fontSize: '0.8rem',
                              letterSpacing: '0.06em',
                              border: '1px solid var(--line-muted)',
                              background: 'var(--paper-surface)',
                              color: 'var(--ink-solid)',
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Review">In Review</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => handleInspectRequest(req)}
                            style={{
                              ...btnStyle,
                              background: 'var(--green-botanical)',
                              color: 'var(--paper-white)',
                              borderColor: 'var(--green-botanical)',
                              marginRight: '8px'
                            }}
                          >
                            Inspect
                          </button>
                          {isAdmin ? (
                            <button
                              onClick={() => handleDeleteRequest(req.id)}
                              style={{ ...btnStyle, color: '#9c2f25', borderColor: '#9c2f25' }}
                              title="Administrator: permanently delete record"
                            >
                              Delete
                            </button>
                          ) : (
                            <span
                              style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '0.72rem',
                                letterSpacing: '0.05em',
                                color: 'var(--ink-muted)',
                                border: '1px dashed var(--line-muted)',
                                padding: '5px 8px',
                                textTransform: 'uppercase'
                              }}
                              title="Record deletion requires Administrator role"
                            >
                              Edit Only
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          04 — TEAM ACCESS & ROLES (ADMIN ONLY)
          ═══════════════════════════════════════════════ */}
      {isAdmin && (
        <section style={{ paddingBottom: '90px' }} id="section-team-roles">
          <div className="container">
            <div className="admin-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <span className="section-datum">04 — TEAM ACCESS & ROLES</span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCreateUserModalOpen(true)}
                  className="btn-monograph"
                  style={{ fontSize: '0.85rem', padding: '8px 18px', background: 'var(--green-botanical)', color: 'var(--paper-white)', borderColor: 'var(--green-botanical)' }}
                >
                  + Add Team Member
                </button>
                <button
                  type="button"
                  onClick={loadUsersList}
                  className="btn-monograph"
                  style={{ background: 'transparent', color: 'var(--ink-solid)', fontSize: '0.85rem', padding: '8px 18px' }}
                  title="Refresh user directory"
                >
                  ↻ Refresh Directory
                </button>
              </div>
            </div>

            <div style={panelStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <h2 style={headingStyle}>ROLE-BASED ACCESS CONTROL (RBAC) DIRECTORY</h2>
                  <p style={{ color: 'var(--ink-secondary)', maxWidth: '640px', lineHeight: 1.6, margin: 0 }}>
                    Configure user responsibilities and platform permissions. Administrators can reassign user roles between <strong>Administrator</strong> (Full Platform Control), <strong>Regular Employee</strong> (Operational Request & Dispatch Management), and <strong>Client Member</strong> (Personal Dashboard).
                  </p>
                </div>
                {userRoleStatus.message && (
                  <span style={{
                    padding: '8px 14px',
                    border: '1px solid currentColor',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: userRoleStatus.type === 'error' ? '#9c2f25' : 'var(--green-botanical)'
                  }}>
                    {userRoleStatus.message}
                  </span>
                )}
              </div>

              {loadingUsers ? (
                <p className="empty-note">Loading users…</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--line-ink)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem', color: 'var(--ink-secondary)' }}>
                        <th style={{ padding: '12px 14px' }}>User ID</th>
                        <th style={{ padding: '12px 14px' }}>Name & Contact</th>
                        <th style={{ padding: '12px 14px' }}>Current Role</th>
                        <th style={{ padding: '12px 14px' }}>Access Permissions</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Reassign Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map(u => {
                        const isCurrent = u.id === user?.id;
                        return (
                          <tr key={u.id} style={{ borderBottom: '1px solid var(--line-muted)' }}>
                            <td style={{ padding: '14px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>
                              #{u.id}
                            </td>
                            <td style={{ padding: '14px' }}>
                              <div style={{ fontWeight: 600, color: 'var(--ink-solid)' }}>
                                {u.first_name} {u.last_name} {isCurrent && <span style={{ fontSize: '0.75rem', color: 'var(--green-botanical)' }}>(You)</span>}
                              </div>
                              <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>{u.email}</div>
                            </td>
                            <td style={{ padding: '14px' }}>
                              <span style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '0.78rem',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                padding: '4px 10px',
                                border: '1px solid',
                                borderColor: u.role === 'admin' ? 'var(--green-botanical)' : (u.role === 'employee' ? '#d97706' : 'var(--line-muted)'),
                                color: u.role === 'admin' ? 'var(--green-botanical)' : (u.role === 'employee' ? '#d97706' : 'var(--ink-secondary)'),
                                background: 'var(--paper-surface)',
                                fontWeight: 600
                              }}>
                                {u.role === 'admin' ? 'Administrator' : (u.role === 'employee' ? 'Regular Employee' : 'Customer')}
                              </span>
                            </td>
                            <td style={{ padding: '14px', color: 'var(--ink-secondary)', fontSize: '0.82rem' }}>
                              {u.role === 'admin'
                                ? 'Full CRUD on Services, Blogs, Requests & Role Management'
                                : (u.role === 'employee'
                                  ? 'View all requests, update status/notes/quotes (No Delete)'
                                  : 'Submit & track personal requests only')}
                            </td>
                            <td style={{ padding: '14px', textAlign: 'right' }}>
                              <select
                                value={u.role || (u.is_admin ? 'admin' : 'customer')}
                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                style={{
                                  ...inputStyle,
                                  width: 'auto',
                                  padding: '6px 12px',
                                  fontSize: '0.85rem',
                                  fontFamily: 'var(--font-display)'
                                }}
                              >
                                <option value="admin">Administrator</option>
                                <option value="employee">Regular Employee</option>
                                <option value="customer">Client Member</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════
          REQUEST INSPECTOR & STATUS UPDATE MODAL
          ═══════════════════════════════════════════════ */}
      {inspectModalOpen && selectedRequest && (
        <div className="modal-backdrop" onClick={closeInspectModal}>
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '750px', width: '92%' }}
          >
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span className="hero-super-line">REQUEST INSPECTOR</span>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink-muted)' }}>
                    #SR-{selectedRequest.id}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.5rem', letterSpacing: '0.08em', margin: '4px 0 0 0' }}>
                  {selectedRequest.service_title}
                </h2>
              </div>
              <button className="modal-close-btn" onClick={closeInspectModal} aria-label="Close modal">
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ padding: '24px 30px' }}>
              {/* Customer Profile Row */}
              <div style={{
                background: 'var(--paper-surface)',
                border: '1px solid var(--line-muted)',
                padding: '16px 20px',
                marginBottom: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '14px',
                fontSize: '0.9rem'
              }}>
                <div>
                  <span style={{ color: 'var(--ink-muted)', display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
                    Client Name
                  </span>
                  <strong style={{ color: 'var(--ink-solid)' }}>{selectedRequest.name}</strong>
                </div>

                <div>
                  <span style={{ color: 'var(--ink-muted)', display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
                    Email Contact
                  </span>
                  <a href={`mailto:${selectedRequest.email}`} style={{ color: 'var(--green-botanical)', textDecoration: 'underline' }}>
                    {selectedRequest.email}
                  </a>
                </div>

                <div>
                  <span style={{ color: 'var(--ink-muted)', display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
                    Phone Contact
                  </span>
                  <span style={{ color: 'var(--ink-solid)' }}>
                    {selectedRequest.phone || 'Not provided'}
                  </span>
                </div>

                <div>
                  <span style={{ color: 'var(--ink-muted)', display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
                    Company / Organization
                  </span>
                  <span style={{ color: 'var(--ink-solid)' }}>
                    {selectedRequest.company || 'Individual / Independent'}
                  </span>
                </div>

                <div>
                  <span style={{ color: 'var(--ink-muted)', display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
                    Account Type
                  </span>
                  <span style={{ color: selectedRequest.user_id ? 'var(--green-botanical)' : 'var(--ink-muted)', fontWeight: 600 }}>
                    {selectedRequest.user_id ? '✓ Registered Account Member' : 'Guest Client Submission'}
                  </span>
                </div>

                <div>
                  <span style={{ color: 'var(--ink-muted)', display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
                    Submission Timestamp
                  </span>
                  <span style={{ color: 'var(--ink-solid)' }}>
                    {new Date(selectedRequest.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Client Project Message */}
              <div style={{ marginBottom: '24px' }}>
                <span style={labelStyle}>Client Project Scope / Message:</span>
                <div style={{
                  background: 'var(--paper-white)',
                  border: '1px solid var(--line-ink)',
                  padding: '16px 20px',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                  color: 'var(--ink-solid)',
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  {selectedRequest.message}
                </div>
              </div>

              {/* ── Status & Processing Control Form ── */}
              <form onSubmit={handleSaveInspectChanges} style={{ borderTop: '1px solid var(--line-muted)', paddingTop: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                  <div className="admin-field">
                    <label style={labelStyle}>Update Request Status *</label>
                    <select
                      value={editForm.status}
                      onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                      style={inputStyle}
                      required
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Review">In Review</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div className="admin-field">
                    <label style={labelStyle}>Urgency / Priority *</label>
                    <select
                      value={editForm.priority}
                      onChange={e => setEditForm({ ...editForm, priority: e.target.value })}
                      style={inputStyle}
                      required
                    >
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="admin-field" style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>Estimated Cost / Quote Estimate</label>
                  <input
                    type="text"
                    value={editForm.estimated_cost}
                    onChange={e => setEditForm({ ...editForm, estimated_cost: e.target.value })}
                    placeholder="e.g. $4,500 - $6,000 or Fixed $3,500"
                    style={inputStyle}
                  />
                  <small style={{ color: 'var(--ink-muted)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                    Visible to registered customer in their personal dashboard order tracking.
                  </small>
                </div>

                <div className="admin-field" style={{ marginBottom: '22px' }}>
                  <label style={labelStyle}>Internal & Client Progress Notes</label>
                  <textarea
                    rows="3"
                    value={editForm.admin_notes}
                    onChange={e => setEditForm({ ...editForm, admin_notes: e.target.value })}
                    placeholder="Internal team updates, milestone progress notes, or communication summary..."
                    style={{ ...inputStyle, resize: 'vertical' }}
                  ></textarea>
                  <small style={{ color: 'var(--ink-muted)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                    Shared as the studio progress update displayed on customer request summaries.
                  </small>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    {requestActionStatus.message && (
                      <span style={{
                        fontSize: '0.9rem',
                        color: requestActionStatus.type === 'error' ? '#9c2f25' : 'var(--green-botanical)',
                        fontWeight: 600
                      }}>
                        {requestActionStatus.message}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={closeInspectModal}
                      className="btn-monograph"
                      style={{ background: 'transparent', color: 'var(--ink-solid)' }}
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="btn-monograph"
                      disabled={savingRequest}
                    >
                      {savingRequest ? 'Saving…' : 'Save Request Updates'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* ═══════════════════════════════════════════════
          CREATE TEAM MEMBER MODAL
          ═══════════════════════════════════════════════ */}
      {createUserModalOpen && (
        <div className="modal-backdrop" onClick={() => setCreateUserModalOpen(false)}>
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '640px', width: '92%' }}
          >
            <div className="modal-header">
              <div>
                <span className="hero-super-line">TEAM RECRUITMENT & ACCESS</span>
                <h2 style={{ fontSize: '1.5rem', letterSpacing: '0.08em', margin: '4px 0 0 0' }}>
                  NEW TEAM MEMBER ONBOARDING
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCreateUserModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.6rem', cursor: 'pointer', color: 'var(--ink-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} style={{ marginTop: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="admin-field">
                  <label style={labelStyle}>First Name *</label>
                  <input
                    type="text"
                    required
                    value={newUserForm.first_name}
                    onChange={e => setNewUserForm({ ...newUserForm, first_name: e.target.value })}
                    style={inputStyle}
                    placeholder="e.g. Maya"
                  />
                </div>
                <div className="admin-field">
                  <label style={labelStyle}>Last Name *</label>
                  <input
                    type="text"
                    required
                    value={newUserForm.last_name}
                    onChange={e => setNewUserForm({ ...newUserForm, last_name: e.target.value })}
                    style={inputStyle}
                    placeholder="e.g. Lin"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="admin-field">
                  <label style={labelStyle}>Work Email *</label>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    style={inputStyle}
                    placeholder="e.g. maya@fcorpse.com"
                  />
                </div>
                <div className="admin-field">
                  <label style={labelStyle}>Temporary Password *</label>
                  <input
                    type="password"
                    required
                    minLength="6"
                    value={newUserForm.password}
                    onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    style={inputStyle}
                    placeholder="Min 6 characters"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="admin-field">
                  <label style={labelStyle}>Assigned Role *</label>
                  <select
                    value={newUserForm.role}
                    onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="employee">Regular Employee (Operational Access)</option>
                    <option value="admin">Administrator (Full Platform Control)</option>
                    <option value="customer">Client Member (Customer Access)</option>
                  </select>
                </div>
                <div className="admin-field">
                  <label style={labelStyle}>Contact Phone</label>
                  <input
                    type="text"
                    value={newUserForm.phone}
                    onChange={e => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                    style={inputStyle}
                    placeholder="Optional phone number"
                  />
                </div>
              </div>

              <div className="admin-field" style={{ marginBottom: '22px' }}>
                <label style={labelStyle}>Role Title / Bio</label>
                <input
                  type="text"
                  value={newUserForm.bio}
                  onChange={e => setNewUserForm({ ...newUserForm, bio: e.target.value })}
                  style={inputStyle}
                  placeholder="e.g. Technical Operations & Dispatch Lead"
                />
              </div>

              {createUserError && (
                <div style={{ padding: '10px 14px', background: '#fdf2f2', border: '1px solid #9c2f25', color: '#9c2f25', fontSize: '0.88rem', marginBottom: '16px' }}>
                  {createUserError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setCreateUserModalOpen(false)}
                  className="btn-monograph"
                  style={{ background: 'transparent', color: 'var(--ink-solid)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-monograph"
                  disabled={creatingUser}
                >
                  {creatingUser ? 'Creating…' : 'Create & Onboard Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Admin;
