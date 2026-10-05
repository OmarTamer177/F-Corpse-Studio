import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../services/api';

const Admin = () => {
  const { user, token, isAdmin, isEmployee, role } = useAuth();

  // Active Ledger Tab
  const [activeTab, setActiveTab] = useState('projects');

  // ── Task 11 Projects State ──
  const [projects, setProjects] = useState([]);
  const [projectStats, setProjectStats] = useState({ total: 0, not_started: 0, in_progress: 0, on_hold: 0, completed: 0 });
  const [loadingProjects, setLoadingProjects] = useState(true);

  // ── Services State ──
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [errorServices, setErrorServices] = useState('');
  const [serviceForm, setServiceForm] = useState({ id: '', title: '', description: '', category: 'Game Engineering', price: '' });
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

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  useEffect(() => {
    loadServices();
    loadPosts();
    if (token) {
      loadProjects();
      loadProjectStats();
      loadRequests();
      loadRequestStats();
      if (isAdmin) {
        loadUsersList();
      }
    }
  }, [token, isAdmin]);

  // ── Projects Handlers ──
  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch(`${API_BASE}/projects`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.warn('Failed to load projects', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadProjectStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects/stats`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setProjectStats(data);
      }
    } catch (err) {
      console.warn('Failed to load project stats', err);
    }
  };

  const handleQuickProjectStatusChange = async (projectId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Status transition failed.');
      const data = await res.json();
      setProjects(prev => prev.map(p => p.id === projectId ? data.project : p));
      loadProjectStats();
    } catch (err) {
      alert(err.message);
    }
  };

  // ── Users Handlers ──
  const loadUsersList = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_BASE}/auth/users`, { headers: authHeaders });
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
        headers: authHeaders,
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
        headers: authHeaders,
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
      setErrorServices('Could not reach the studio services API.');
    } finally {
      setLoadingServices(false);
    }
  };

  const handleServiceChange = (e) => {
    const { name, value } = e.target;
    setServiceForm(prev => ({ ...prev, [name]: value }));
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingService(true);
    setServiceFormStatus({ message: '', type: '' });

    const isEdit = Boolean(serviceForm.id);
    const url = isEdit ? `${API_BASE}/services/${serviceForm.id}` : `${API_BASE}/services`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify({
          title: serviceForm.title.trim(),
          description: serviceForm.description.trim(),
          category: serviceForm.category || 'Game Engineering',
          price: serviceForm.price.trim() || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save service.');

      setServiceFormStatus({
        message: isEdit ? 'Service specification updated.' : 'New service discipline added.',
        type: 'success'
      });
      setServiceForm({ id: '', title: '', description: '', category: 'Game Engineering', price: '' });
      loadServices();
    } catch (err) {
      setServiceFormStatus({ message: err.message, type: 'error' });
    } finally {
      setIsSubmittingService(false);
    }
  };

  const handleServiceEdit = (svc) => {
    setServiceForm({
      id: svc.id,
      title: svc.title,
      description: svc.description,
      category: svc.category || 'Game Engineering',
      price: svc.price || ''
    });
    setServiceFormStatus({ message: '', type: '' });
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleServiceCancelEdit = () => {
    setServiceForm({ id: '', title: '', description: '', category: 'Game Engineering', price: '' });
    setServiceFormStatus({ message: '', type: '' });
  };

  const handleServiceDelete = async (id) => {
    if (!window.confirm(`Permanently remove service discipline #${id}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/services/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete service.');
      }
      loadServices();
    } catch (err) {
      alert(err.message);
    }
  };

  // ── Blog Handlers ──
  const loadPosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await fetch(`${API_BASE}/blogs`);
      if (!res.ok) throw new Error('Unable to load dispatches.');
      const data = await res.json();
      setPosts(data);
      setErrorPosts('');
    } catch (err) {
      setErrorPosts('Could not reach the dispatches API.');
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormStatus({ message: '', type: '' });

    const isEdit = Boolean(formData.id);
    const url = isEdit ? `${API_BASE}/blogs/${formData.id}` : `${API_BASE}/blogs`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify({
          title: formData.title.trim(),
          author: formData.author.trim() || undefined,
          content: formData.content.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save dispatch.');

      setFormStatus({
        message: isEdit ? 'Dispatch updated successfully.' : 'New dispatch published.',
        type: 'success'
      });
      setFormData({ id: '', title: '', author: '', content: '' });
      loadPosts();
    } catch (err) {
      setFormStatus({ message: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (post) => {
    setFormData({
      id: post.id,
      title: post.title,
      author: post.author || '',
      content: post.content
    });
    setFormStatus({ message: '', type: '' });
  };

  const handleCancelEdit = () => {
    setFormData({ id: '', title: '', author: '', content: '' });
    setFormStatus({ message: '', type: '' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Permanently delete dispatch #${id}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/blogs/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete post.');
      }
      loadPosts();
    } catch (err) {
      alert(err.message);
    }
  };

  // ── Customer Requests Handlers ──
  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch(`${API_BASE}/requests`, { headers: authHeaders });
      if (!res.ok) throw new Error('Unable to load customer inquiries.');
      const data = await res.json();
      setRequests(data);
      setErrorRequests('');
    } catch (err) {
      setErrorRequests(err.message);
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadRequestStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/requests/stats`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setRequestStats(data);
      }
    } catch (err) {
      console.warn('Could not load request stats', err);
    }
  };

  const handleQuickStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/requests/${id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ status: newStatus })
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || 'Status update failed.');
      setRequests(prev => prev.map(r => r.id === id ? updated : r));
      loadRequestStats();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleInspectRequest = (req) => {
    setSelectedRequest(req);
    setEditForm({
      status: req.status || 'Pending',
      priority: req.priority || 'Normal',
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
    setRequestActionStatus({ message: '', type: '' });

    try {
      const res = await fetch(`${API_BASE}/requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: authHeaders,
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
      setRequestActionStatus({ message: 'Commission updates recorded.', type: 'success' });
      loadRequestStats();
    } catch (err) {
      setRequestActionStatus({ message: err.message, type: 'error' });
    } finally {
      setSavingRequest(false);
    }
  };

  const handleDeleteRequest = async (id) => {
    if (!window.confirm(`Permanently remove commission record #SR-${id}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/requests/${id}`, {
        method: 'DELETE',
        headers: authHeaders
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
      case 'in progress': return 'status-in-progress';
      case 'completed': return 'status-completed';
      case 'on hold':
      case 'pending': return 'status-pending';
      case 'in review': return 'status-in-review';
      case 'rejected': return 'status-rejected';
      default: return 'status-not-started';
    }
  };

  const truncate = (text, max) => (text && text.length > max) ? text.slice(0, max).trim() + '…' : text;

  return (
    <>
      {/* ── Studio Operations Hero ── */}
      <section className="services-hero">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <span className="hero-super-line">
                {isAdmin ? 'ADMINISTRATIVE CONTROL SUITE' : 'STUDIO OPERATIONS DISPATCH'}
              </span>
              <h1 className="services-title">
                {isAdmin ? 'STUDIO' : 'OPERATIONS'}<br /><span>LEDGER.</span>
              </h1>
              <p className="hero-editorial-lead">
                Centralized architectural console for managing commissions, project pipelines, offerings catalog, dispatches, and role governance.
              </p>
            </div>

            <div style={{
              background: 'var(--paper-white)',
              border: '1px solid var(--line-ink)',
              padding: '16px 20px',
              maxWidth: '360px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green-botanical)' }}></span>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.82rem',
                  letterSpacing: '0.1em',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--green-botanical)'
                }}>
                  CLEARANCE // {isAdmin ? 'ADMINISTRATOR' : 'STUDIO EMPLOYEE'}
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', margin: 0, lineHeight: 1.5, fontFamily: 'var(--font-editorial)' }}>
                {isAdmin
                  ? 'Full clearance: manage project lifecycles, service disciplines, dispatches, user roles, and client relationships.'
                  : 'Operational clearance: update projects, evaluate commission inquiries, and track deliverables.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Architectural Ledger Section ── */}
      <section style={{ paddingBottom: '90px' }}>
        <div className="container">

          {/* ── Top-Level Monograph Tabs ── */}
          <div className="monograph-tabs-container">
            <button
              type="button"
              id="tab-btn-projects"
              className={`monograph-tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
              onClick={() => setActiveTab('projects')}
            >
              01 // PROJECT PIPELINE
              <span className="monograph-tab-count">{projects.length}</span>
            </button>

            <button
              type="button"
              id="tab-btn-requests"
              className={`monograph-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              02 // COMMISSION INQUIRIES
              <span className="monograph-tab-count">{requests.length}</span>
            </button>

            <button
              type="button"
              id="tab-btn-services"
              className={`monograph-tab-btn ${activeTab === 'services' ? 'active' : ''}`}
              onClick={() => setActiveTab('services')}
            >
              03 // DISCIPLINES CATALOG
              <span className="monograph-tab-count">{services.length}</span>
            </button>

            <button
              type="button"
              id="tab-btn-blogs"
              className={`monograph-tab-btn ${activeTab === 'blogs' ? 'active' : ''}`}
              onClick={() => setActiveTab('blogs')}
            >
              04 // EDITORIAL DISPATCHES
              <span className="monograph-tab-count">{posts.length}</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                id="tab-btn-team"
                className={`monograph-tab-btn ${activeTab === 'team' ? 'active' : ''}`}
                onClick={() => setActiveTab('team')}
              >
                05 // PERSONNEL & ROLES
                <span className="monograph-tab-count">{usersList.length}</span>
              </button>
            )}
          </div>

          {/* ═══════════════════════════════════════════════
              TAB 01 // PROJECT PIPELINE
              ═══════════════════════════════════════════════ */}
          {activeTab === 'projects' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <span className="section-datum">01 — PROJECT PIPELINE</span>
                  <h2 style={{ fontSize: '1.4rem', letterSpacing: '0.08em', margin: '4px 0 0 0' }}>
                    ACTIVE WORKSHOP DELIVERABLES
                  </h2>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <Link
                    to="/projects"
                    className="btn-monograph"
                    style={{ fontSize: '0.85rem', padding: '10px 20px' }}
                  >
                    Open Full Projects Workspace →
                  </Link>
                  <button
                    type="button"
                    onClick={() => { loadProjects(); loadProjectStats(); }}
                    className="btn-monograph"
                    style={{ background: 'transparent', color: 'var(--ink-solid)', fontSize: '0.85rem', padding: '10px 16px' }}
                  >
                    [Refresh Ledger]
                  </button>
                </div>
              </div>

              {/* Metric Counters */}
              <div className="architectural-metrics-grid">
                <div className="architectural-metric-card">
                  <span className="metric-datum-label">ACTIVE IN WORKSHOP</span>
                  <div className="metric-value-display" style={{ color: 'var(--green-botanical)' }}>
                    {projectStats.in_progress}
                  </div>
                </div>
                <div className="architectural-metric-card">
                  <span className="metric-datum-label">DELIVERED MILESTONES</span>
                  <div className="metric-value-display">
                    {projectStats.completed}
                  </div>
                </div>
                <div className="architectural-metric-card">
                  <span className="metric-datum-label">ON HOLD</span>
                  <div className="metric-value-display" style={{ color: '#8c6b2d' }}>
                    {projectStats.on_hold}
                  </div>
                </div>
                <div className="architectural-metric-card">
                  <span className="metric-datum-label">TOTAL COMMISSIONS</span>
                  <div className="metric-value-display">
                    {projectStats.total}
                  </div>
                </div>
              </div>

              {/* High-Density Project Table */}
              <div className="monograph-table-wrapper">
                {loadingProjects && <p className="empty-note">Loading workshop deliverables…</p>}
                {!loadingProjects && projects.length === 0 && (
                  <p className="empty-note">No active projects registered in the workshop ledger.</p>
                )}
                {!loadingProjects && projects.length > 0 && (
                  <table className="monograph-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Project & Scope</th>
                        <th>Partner Client</th>
                        <th>Status</th>
                        <th>Assigned Staff</th>
                        <th>Deadline</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map(proj => (
                        <tr key={proj.id}>
                          <td style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--green-botanical)' }}>
                            {proj.code}
                          </td>
                          <td>
                            <strong style={{ display: 'block' }}>{proj.name}</strong>
                            <span style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)' }}>
                              {truncate(proj.description, 80) || 'No scope briefing'}
                            </span>
                          </td>
                          <td>
                            <strong>{proj.client?.name || 'Direct'}</strong>
                            {proj.client?.company && (
                              <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                                {proj.client.company}
                              </span>
                            )}
                          </td>
                          <td>
                            <select
                              value={proj.status}
                              onChange={(e) => handleQuickProjectStatusChange(proj.id, e.target.value)}
                              className={`architectural-status-badge ${getStatusBadgeClass(proj.status)}`}
                              style={{ cursor: 'pointer', outline: 'none' }}
                            >
                              {['Not Started', 'In Progress', 'On Hold', 'Completed'].map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            {(proj.team_members && proj.team_members.length > 0) ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {proj.team_members.map(m => (
                                  <span key={m.id} className="artisan-chip" style={{ fontSize: '0.72rem' }}>
                                    {m.name.split(' ')[0]}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>Unassigned</span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>
                            {proj.deadline || '—'}
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <Link
                              to="/projects"
                              className="btn-monograph"
                              style={{ fontSize: '0.78rem', padding: '4px 10px', background: 'transparent' }}
                            >
                              Manage →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              TAB 02 // COMMISSION INQUIRIES
              ═══════════════════════════════════════════════ */}
          {activeTab === 'requests' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <span className="section-datum">02 — CUSTOMER COMMISSIONS</span>
                  <h2 style={{ fontSize: '1.4rem', letterSpacing: '0.08em', margin: '4px 0 0 0' }}>
                    INCOMING COMMISSION INQUIRIES
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => { loadRequests(); loadRequestStats(); }}
                  className="btn-monograph"
                  style={{ background: 'transparent', color: 'var(--ink-solid)', fontSize: '0.85rem', padding: '10px 16px' }}
                >
                  [Refresh Inquiries]
                </button>
              </div>

              {/* Metric Counters */}
              <div className="architectural-metrics-grid">
                <div className="architectural-metric-card">
                  <span className="metric-datum-label">TOTAL INQUIRIES</span>
                  <div className="metric-value-display">{requestStats.total}</div>
                </div>
                <div className="architectural-metric-card">
                  <span className="metric-datum-label">PENDING REVIEW</span>
                  <div className="metric-value-display" style={{ color: '#8c6b2d' }}>{requestStats.pending}</div>
                </div>
                <div className="architectural-metric-card">
                  <span className="metric-datum-label">IN REVIEW</span>
                  <div className="metric-value-display" style={{ color: 'var(--green-botanical)' }}>{requestStats.in_review}</div>
                </div>
                <div className="architectural-metric-card">
                  <span className="metric-datum-label">IN PROGRESS</span>
                  <div className="metric-value-display" style={{ color: 'var(--green-botanical)' }}>{requestStats.in_progress}</div>
                </div>
                <div className="architectural-metric-card">
                  <span className="metric-datum-label">COMPLETED</span>
                  <div className="metric-value-display">{requestStats.completed}</div>
                </div>
              </div>

              {/* Toolbar */}
              <div style={{ background: 'var(--paper-white)', border: '1px solid var(--line-ink)', padding: '18px 24px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['All', 'Pending', 'In Review', 'In Progress', 'Completed', 'Rejected'].map(s => {
                    const count = s === 'All'
                      ? requests.length
                      : requests.filter(r => r.status.toLowerCase() === s.toLowerCase()).length;
                    const isActive = statusFilter.toLowerCase() === s.toLowerCase();
                    return (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        style={{
                          padding: '5px 12px',
                          fontSize: '0.8rem',
                          fontFamily: 'var(--font-display)',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          border: '1px solid var(--line-ink)',
                          background: isActive ? 'var(--ink-solid)' : 'var(--paper-surface)',
                          color: isActive ? 'var(--paper-white)' : 'var(--ink-solid)',
                          cursor: 'pointer'
                        }}
                      >
                        {s} ({count})
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={priorityFilter}
                    onChange={e => setPriorityFilter(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', fontFamily: 'var(--font-display)', fontSize: '0.82rem' }}
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
                    placeholder="Search by client or keyword..."
                    style={{ padding: '6px 10px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', fontSize: '0.85rem', width: '200px' }}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} style={{ background: 'transparent', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer', fontFamily: 'monospace' }}>
                      [✕]
                    </button>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="monograph-table-wrapper">
                {loadingRequests && <p className="empty-note">Loading inquiries…</p>}
                {!loadingRequests && filteredRequests.length === 0 && (
                  <p className="empty-note">No inquiries match the current parameters.</p>
                )}
                {!loadingRequests && filteredRequests.length > 0 && (
                  <table className="monograph-table">
                    <thead>
                      <tr>
                        <th>Ref #</th>
                        <th>Date</th>
                        <th>Client / Partner</th>
                        <th>Requested Discipline</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map(req => (
                        <tr key={req.id}>
                          <td style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--ink-muted)' }}>
                            #SR-{req.id}
                          </td>
                          <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                            {new Date(req.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td>
                            <strong>{req.name}</strong>
                            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--ink-muted)' }}>{req.email}</span>
                            {req.company && (
                              <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--green-botanical)' }}>
                                {req.company}
                              </span>
                            )}
                          </td>
                          <td>
                            <strong>{req.service_title}</strong>
                            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--ink-secondary)' }}>
                              {truncate(req.message, 60)}
                            </span>
                          </td>
                          <td>
                            <span className="architectural-status-badge status-not-started" style={{ fontSize: '0.74rem' }}>
                              {req.priority}
                            </span>
                          </td>
                          <td>
                            <select
                              value={req.status}
                              onChange={(e) => handleQuickStatusChange(req.id, e.target.value)}
                              className={`architectural-status-badge ${getStatusBadgeClass(req.status)}`}
                              style={{ cursor: 'pointer', outline: 'none' }}
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Review">In Review</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              onClick={() => handleInspectRequest(req)}
                              className="btn-monograph"
                              style={{ fontSize: '0.78rem', padding: '6px 12px', marginRight: '8px' }}
                            >
                              Inspect
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRequest(req.id)}
                                className="btn-monograph"
                                style={{ fontSize: '0.78rem', padding: '6px 10px', color: '#9c2f25', borderColor: '#9c2f25', background: 'transparent' }}
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              TAB 03 // DISCIPLINES CATALOG
              ═══════════════════════════════════════════════ */}
          {activeTab === 'services' && (
            <div>
              <div className="admin-section-header" style={{ marginBottom: '24px' }}>
                <span className="section-datum">03 — STUDIO DISCIPLINES</span>
                <h2 style={{ fontSize: '1.4rem', letterSpacing: '0.08em', margin: '4px 0 0 0' }}>
                  CATALOG OF DISCIPLINES & OFFERINGS
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(340px, 1.4fr)', gap: '40px', alignItems: 'start' }}>
                {/* Form or Clearance Notice */}
                <div style={{ background: 'var(--paper-white)', border: '1px solid var(--line-ink)', padding: '26px' }}>
                  {isAdmin ? (
                    <>
                      <h3 style={{ fontSize: '1.25rem', letterSpacing: '0.08em', marginBottom: '18px' }}>
                        {serviceForm.id ? 'UPDATE DISCIPLINE SPEC' : 'NEW DISCIPLINE SPEC'}
                      </h3>

                      <form onSubmit={handleServiceSubmit}>
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                            Discipline Title *
                          </label>
                          <input
                            type="text"
                            name="title"
                            required
                            maxLength="200"
                            value={serviceForm.title}
                            onChange={handleServiceChange}
                            placeholder="e.g. Bare-Metal Shader Engineering"
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)' }}
                          />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                            Scope & Description *
                          </label>
                          <textarea
                            name="description"
                            required
                            rows="4"
                            value={serviceForm.description}
                            onChange={handleServiceChange}
                            placeholder="Technical capabilities, toolsets, and deliverable format..."
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', resize: 'vertical' }}
                          ></textarea>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                              Category
                            </label>
                            <select
                              name="category"
                              value={serviceForm.category}
                              onChange={handleServiceChange}
                              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)' }}
                            >
                              <option value="Game Engineering">Game Engineering</option>
                              <option value="Visual Art & Design">Visual Art & Design</option>
                              <option value="Audio & Sound">Audio & Sound</option>
                              <option value="QA & Evaluation">QA & Evaluation</option>
                              <option value="General">General</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                              Pricing Model
                            </label>
                            <input
                              type="text"
                              name="price"
                              value={serviceForm.price}
                              onChange={handleServiceChange}
                              placeholder="e.g. Commission / Quote"
                              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)' }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <button type="submit" disabled={isSubmittingService} className="btn-monograph">
                            {serviceForm.id ? 'Save Changes' : 'Register Discipline'}
                          </button>
                          {serviceForm.id && (
                            <button type="button" onClick={handleServiceCancelEdit} className="btn-monograph" style={{ background: 'transparent', color: 'var(--ink-solid)' }}>
                              Cancel
                            </button>
                          )}
                          {serviceFormStatus.message && (
                            <span style={{ fontSize: '0.85rem', color: serviceFormStatus.type === 'error' ? '#9c2f25' : 'var(--green-botanical)' }}>
                              {serviceFormStatus.message}
                            </span>
                          )}
                        </div>
                      </form>
                    </>
                  ) : (
                    <div style={{ padding: '24px', border: '1px dashed var(--line-muted)', background: 'var(--paper-surface)' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.1em', color: 'var(--ink-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                        [CLEARANCE REQUIRED // ADMINISTRATOR ONLY]
                      </div>
                      <p style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)', margin: 0, lineHeight: 1.6, fontFamily: 'var(--font-editorial)' }}>
                        Catalog modifications, additions, and deletions are reserved for studio directors. Employees have reference-only access for evaluation.
                      </p>
                    </div>
                  )}
                </div>

                {/* Offerings List */}
                <div style={{ background: 'var(--paper-white)', border: '1px solid var(--line-ink)', padding: '26px' }}>
                  <h3 style={{ fontSize: '1.25rem', letterSpacing: '0.08em', marginBottom: '18px' }}>
                    REGISTERED DISCIPLINES ({services.length})
                  </h3>

                  {loadingServices && <p className="empty-note">Loading catalog…</p>}
                  {!loadingServices && services.length === 0 && <p className="empty-note">No disciplines catalogued yet.</p>}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {!loadingServices && services.map(svc => (
                      <div key={svc.id} style={{ border: '1px solid var(--line-muted)', padding: '16px', background: 'var(--paper-surface)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <strong style={{ fontSize: '1.05rem', letterSpacing: '0.04em' }}>{svc.title}</strong>
                          <span className="technical-discipline-tag" style={{ fontSize: '0.7rem' }}>
                            {svc.category || 'General'}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)', marginBottom: '10px', lineHeight: 1.5, fontFamily: 'var(--font-editorial)' }}>
                          {truncate(svc.description, 140)}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-display)', color: 'var(--green-botanical)' }}>
                            {svc.price || 'Commission Based'}
                          </span>
                          {isAdmin && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => handleServiceEdit(svc)} className="btn-monograph" style={{ fontSize: '0.74rem', padding: '4px 10px', background: 'transparent' }}>
                                Edit
                              </button>
                              <button onClick={() => handleServiceDelete(svc.id)} className="btn-monograph" style={{ fontSize: '0.74rem', padding: '4px 10px', color: '#9c2f25', borderColor: '#9c2f25', background: 'transparent' }}>
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              TAB 04 // EDITORIAL DISPATCHES
              ═══════════════════════════════════════════════ */}
          {activeTab === 'blogs' && (
            <div>
              <div className="admin-section-header" style={{ marginBottom: '24px' }}>
                <span className="section-datum">04 — STUDIO DISPATCHES</span>
                <h2 style={{ fontSize: '1.4rem', letterSpacing: '0.08em', margin: '4px 0 0 0' }}>
                  EDITORIAL JOURNAL & ANNOUNCEMENTS
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(340px, 1.4fr)', gap: '40px', alignItems: 'start' }}>
                <div style={{ background: 'var(--paper-white)', border: '1px solid var(--line-ink)', padding: '26px' }}>
                  {isAdmin ? (
                    <>
                      <h3 style={{ fontSize: '1.25rem', letterSpacing: '0.08em', marginBottom: '18px' }}>
                        {formData.id ? 'EDIT DISPATCH' : 'WRITE NEW DISPATCH'}
                      </h3>

                      <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                            Dispatch Title *
                          </label>
                          <input
                            type="text"
                            name="title"
                            required
                            maxLength="200"
                            value={formData.title}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)' }}
                          />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                            Author Attribution
                          </label>
                          <input
                            type="text"
                            name="author"
                            maxLength="100"
                            value={formData.author}
                            onChange={handleChange}
                            placeholder="e.g. Studio Directors"
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)' }}
                          />
                        </div>

                        <div style={{ marginBottom: '18px' }}>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                            Article Body *
                          </label>
                          <textarea
                            name="content"
                            required
                            rows="6"
                            value={formData.content}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', resize: 'vertical' }}
                          ></textarea>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <button type="submit" disabled={isSubmitting} className="btn-monograph">
                            {formData.id ? 'Update Article' : 'Publish Article'}
                          </button>
                          {formData.id && (
                            <button type="button" onClick={handleCancelEdit} className="btn-monograph" style={{ background: 'transparent', color: 'var(--ink-solid)' }}>
                              Cancel
                            </button>
                          )}
                          {formStatus.message && (
                            <span style={{ fontSize: '0.85rem', color: formStatus.type === 'error' ? '#9c2f25' : 'var(--green-botanical)' }}>
                              {formStatus.message}
                            </span>
                          )}
                        </div>
                      </form>
                    </>
                  ) : (
                    <div style={{ padding: '24px', border: '1px dashed var(--line-muted)', background: 'var(--paper-surface)' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.1em', color: 'var(--ink-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                        [CLEARANCE REQUIRED // ADMINISTRATOR ONLY]
                      </div>
                      <p style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)', margin: 0, lineHeight: 1.6, fontFamily: 'var(--font-editorial)' }}>
                        Publishing and managing studio journal dispatches requires Administrator authorization.
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ background: 'var(--paper-white)', border: '1px solid var(--line-ink)', padding: '26px' }}>
                  <h3 style={{ fontSize: '1.25rem', letterSpacing: '0.08em', marginBottom: '18px' }}>
                    PUBLISHED DISPATCHES ({posts.length})
                  </h3>

                  {loadingPosts && <p className="empty-note">Loading dispatches…</p>}
                  {!loadingPosts && posts.length === 0 && <p className="empty-note">No published dispatches yet.</p>}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {!loadingPosts && posts.map(post => (
                      <div key={post.id} style={{ border: '1px solid var(--line-muted)', padding: '16px', background: 'var(--paper-surface)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <strong style={{ fontSize: '1.05rem' }}>{post.title}</strong>
                          <span style={{ fontSize: '0.76rem', color: 'var(--ink-muted)' }}>
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)', marginBottom: '10px', lineHeight: 1.5, fontFamily: 'var(--font-editorial)' }}>
                          {truncate(post.content, 140)}
                        </p>
                        {isAdmin && (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => handleEdit(post)} className="btn-monograph" style={{ fontSize: '0.74rem', padding: '4px 10px', background: 'transparent' }}>
                              Edit
                            </button>
                            <button onClick={() => handleDelete(post.id)} className="btn-monograph" style={{ fontSize: '0.74rem', padding: '4px 10px', color: '#9c2f25', borderColor: '#9c2f25', background: 'transparent' }}>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              TAB 05 // PERSONNEL & ROLES (ADMIN ONLY)
              ═══════════════════════════════════════════════ */}
          {activeTab === 'team' && isAdmin && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <span className="section-datum">05 — PERSONNEL DIRECTORY</span>
                  <h2 style={{ fontSize: '1.4rem', letterSpacing: '0.08em', margin: '4px 0 0 0' }}>
                    ROLE-BASED ACCESS CONTROL (RBAC) GOVERNANCE
                  </h2>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setCreateUserModalOpen(true)}
                    className="btn-monograph"
                    style={{ fontSize: '0.85rem', padding: '10px 18px' }}
                  >
                    + Onboard Team Member
                  </button>
                  <button
                    type="button"
                    onClick={loadUsersList}
                    className="btn-monograph"
                    style={{ background: 'transparent', color: 'var(--ink-solid)', fontSize: '0.85rem', padding: '10px 16px' }}
                  >
                    [Refresh Directory]
                  </button>
                </div>
              </div>

              {userRoleStatus.message && (
                <div style={{
                  padding: '10px 16px',
                  border: '1px solid',
                  borderColor: userRoleStatus.type === 'error' ? '#9c2f25' : 'var(--green-botanical)',
                  color: userRoleStatus.type === 'error' ? '#9c2f25' : 'var(--green-botanical)',
                  background: 'var(--paper-white)',
                  marginBottom: '20px',
                  fontSize: '0.88rem'
                }}>
                  {userRoleStatus.message}
                </div>
              )}

              <div className="monograph-table-wrapper">
                {loadingUsers && <p className="empty-note">Loading user directory…</p>}
                {!loadingUsers && (
                  <table className="monograph-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Artisan / Personnel</th>
                        <th>Role Clearance</th>
                        <th>Granted Capabilities</th>
                        <th style={{ textAlign: 'right' }}>Reassign Clearance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map(u => {
                        const isCurrent = u.id === user?.id;
                        return (
                          <tr key={u.id}>
                            <td style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>
                              #{u.id}
                            </td>
                            <td>
                              <strong>{u.first_name} {u.last_name}</strong> {isCurrent && <span style={{ color: 'var(--green-botanical)', fontSize: '0.78rem' }}>(You)</span>}
                              <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--ink-muted)' }}>{u.email}</span>
                            </td>
                            <td>
                              <span className={`architectural-status-badge ${u.role === 'admin' ? 'status-completed' : (u.role === 'employee' ? 'status-in-progress' : 'status-not-started')}`}>
                                {u.role === 'admin' ? 'ADMINISTRATOR' : (u.role === 'employee' ? 'EMPLOYEE' : 'CUSTOMER')}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)' }}>
                              {u.role === 'admin'
                                ? 'Full Platform Control (CRUD Projects, Catalogs, Dispatches, Roles)'
                                : (u.role === 'employee'
                                  ? 'Workshop Execution (Create/Update Projects, Review Inquiries)'
                                  : 'Client Member (View Contracted Projects & Inquiries)')}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <select
                                value={u.role || (u.is_admin ? 'admin' : 'customer')}
                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                style={{
                                  padding: '5px 8px',
                                  fontSize: '0.8rem',
                                  fontFamily: 'var(--font-display)',
                                  border: '1px solid var(--line-muted)',
                                  background: 'var(--paper-surface)'
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
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Request Inspector Modal ── */}
      {inspectModalOpen && selectedRequest && (
        <div className="modal-backdrop" onClick={closeInspectModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px', width: '92%' }}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className="hero-super-line">INSPECTION LEDGER</span>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
                    #SR-{selectedRequest.id}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.4rem', letterSpacing: '0.08em', margin: '4px 0 0 0' }}>
                  {selectedRequest.service_title}
                </h2>
              </div>
              <button className="modal-close-btn" onClick={closeInspectModal}>
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ padding: '24px 30px' }}>
              {/* Profile Details */}
              <div style={{ background: 'var(--paper-surface)', border: '1px solid var(--line-muted)', padding: '16px 20px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', fontSize: '0.88rem' }}>
                <div>
                  <span style={{ color: 'var(--ink-muted)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)' }}>CLIENT</span>
                  <strong>{selectedRequest.name}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--ink-muted)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)' }}>EMAIL</span>
                  <a href={`mailto:${selectedRequest.email}`} style={{ color: 'var(--green-botanical)' }}>{selectedRequest.email}</a>
                </div>
                <div>
                  <span style={{ color: 'var(--ink-muted)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)' }}>ORGANIZATION</span>
                  <span>{selectedRequest.company || 'Independent'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--ink-muted)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)' }}>SUBMISSION DATE</span>
                  <span>{new Date(selectedRequest.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Scope */}
              <div style={{ marginBottom: '20px' }}>
                <span style={{ display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', marginBottom: '6px' }}>CLIENT SCOPE BRIEF:</span>
                <div style={{ background: 'var(--paper-white)', border: '1px solid var(--line-ink)', padding: '16px', lineHeight: 1.6, maxHeight: '160px', overflowY: 'auto', fontFamily: 'var(--font-editorial)', fontStyle: 'italic' }}>
                  "{selectedRequest.message}"
                </div>
              </div>

              {/* Status Update Form */}
              <form onSubmit={handleSaveInspectChanges} style={{ borderTop: '1px solid var(--line-muted)', paddingTop: '18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
                      Status Transition *
                    </label>
                    <select
                      value={editForm.status}
                      onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)' }}
                      required
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Review">In Review</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
                      Priority Level *
                    </label>
                    <select
                      value={editForm.priority}
                      onChange={e => setEditForm({ ...editForm, priority: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)' }}
                      required
                    >
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
                    Cost Assessment / Estimate
                  </label>
                  <input
                    type="text"
                    value={editForm.estimated_cost}
                    onChange={e => setEditForm({ ...editForm, estimated_cost: e.target.value })}
                    placeholder="e.g. $6,000 USD or Fixed"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)' }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
                    Studio Notes & Progress Updates
                  </label>
                  <textarea
                    rows="3"
                    value={editForm.admin_notes}
                    onChange={e => setEditForm({ ...editForm, admin_notes: e.target.value })}
                    placeholder="Milestone progress notes or scope feedback..."
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', resize: 'vertical' }}
                  ></textarea>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div>
                    {requestActionStatus.message && (
                      <span style={{ fontSize: '0.85rem', color: requestActionStatus.type === 'error' ? '#9c2f25' : 'var(--green-botanical)', fontWeight: 600 }}>
                        {requestActionStatus.message}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={closeInspectModal} className="btn-monograph" style={{ background: 'transparent', color: 'var(--ink-solid)' }}>
                      Close
                    </button>
                    <button type="submit" disabled={savingRequest} className="btn-monograph">
                      {savingRequest ? 'Recording...' : 'Save Updates'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Team Member Modal ── */}
      {createUserModalOpen && (
        <div className="modal-backdrop" onClick={() => setCreateUserModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', width: '92%' }}>
            <div className="modal-header">
              <div>
                <span className="hero-super-line">PERSONNEL ONBOARDING</span>
                <h2 style={{ fontSize: '1.3rem', letterSpacing: '0.08em', margin: '4px 0 0 0' }}>
                  ONBOARD STUDIO TEAM MEMBER
                </h2>
              </div>
              <button className="modal-close-btn" onClick={() => setCreateUserModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit}>
              <div className="modal-body" style={{ padding: '22px 28px' }}>
                {createUserError && (
                  <div style={{ padding: '8px 12px', background: 'rgba(156, 47, 37, 0.08)', color: '#9c2f25', marginBottom: '14px', fontSize: '0.85rem' }}>
                    {createUserError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>First Name *</label>
                    <input
                      type="text"
                      required
                      value={newUserForm.first_name}
                      onChange={e => setNewUserForm(prev => ({ ...prev, first_name: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>Last Name *</label>
                    <input
                      type="text"
                      required
                      value={newUserForm.last_name}
                      onChange={e => setNewUserForm(prev => ({ ...prev, last_name: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={e => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>Password *</label>
                    <input
                      type="password"
                      required
                      minLength="6"
                      value={newUserForm.password}
                      onChange={e => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>Role Clearance *</label>
                    <select
                      value={newUserForm.role}
                      onChange={e => setNewUserForm(prev => ({ ...prev, role: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)' }}
                    >
                      <option value="employee">Regular Employee</option>
                      <option value="admin">Administrator</option>
                      <option value="customer">Client Member</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '14px 28px', borderTop: '1px solid var(--line-muted)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setCreateUserModalOpen(false)} className="btn-monograph" style={{ background: 'transparent', color: 'var(--ink-solid)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={creatingUser} className="btn-monograph">
                  {creatingUser ? 'Onboarding...' : 'Onboard Personnel'}
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
