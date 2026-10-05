import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../services/api';

const STATUS_OPTIONS = ['Not Started', 'In Progress', 'On Hold', 'Completed'];

const Projects = () => {
  const { user, token, isAdmin, isEmployee } = useAuth();
  const canManageProjects = isAdmin || isEmployee;

  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({ total: 0, not_started: 0, in_progress: 0, on_hold: 0, completed: 0 });
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('All');

  // Project Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    status: 'Not Started',
    client_id: '',
    start_date: '',
    deadline: '',
    budget: '',
    team_member_ids: []
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Client Modal State
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', company: '', email: '', phone: '', notes: '' });
  const [clientFormError, setClientFormError] = useState('');
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);

  useEffect(() => {
    if (token) {
      loadProjects();
      loadStats();
      if (canManageProjects) {
        loadClients();
        loadTeamMembers();
      }
    }
  }, [token, canManageProjects]);

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/projects`, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed to load studio project directory.');
      const data = await res.json();
      setProjects(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects/stats`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.warn('Could not load project stats', err);
    }
  };

  const loadClients = async () => {
    try {
      const res = await fetch(`${API_BASE}/clients`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.warn('Could not load clients', err);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/users`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        // Filter to employees and admins
        const staff = data.filter(u => u.role === 'admin' || u.role === 'employee' || u.is_admin);
        setTeamMembers(staff);
      }
    } catch (err) {
      console.warn('Could not load team members', err);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingProject(null);
    setFormError('');
    setFormData({
      name: '',
      code: '',
      description: '',
      status: 'Not Started',
      client_id: clients[0]?.id || '',
      start_date: '',
      deadline: '',
      budget: '',
      team_member_ids: user?.id ? [user.id] : []
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (project) => {
    setEditingProject(project);
    setFormError('');
    setFormData({
      name: project.name,
      code: project.code,
      description: project.description || '',
      status: project.status,
      client_id: project.client_id,
      start_date: project.start_date || '',
      deadline: project.deadline || '',
      budget: project.budget || '',
      team_member_ids: (project.team_members || []).map(m => m.id)
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProject(null);
    setFormError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMemberToggle = (userId) => {
    setFormData(prev => {
      const exists = prev.team_member_ids.includes(userId);
      return {
        ...prev,
        team_member_ids: exists
          ? prev.team_member_ids.filter(id => id !== userId)
          : [...prev.team_member_ids, userId]
      };
    });
  };

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    if (!formData.name.trim()) {
      setFormError('Project title is required.');
      setIsSubmitting(false);
      return;
    }
    if (!formData.client_id) {
      setFormError('Please assign a client organization.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim() || undefined,
      description: formData.description.trim() || undefined,
      status: formData.status,
      client_id: parseInt(formData.client_id, 10),
      start_date: formData.start_date || null,
      deadline: formData.deadline || null,
      budget: formData.budget.trim() || null,
      team_member_ids: formData.team_member_ids
    };

    try {
      const url = editingProject
        ? `${API_BASE}/projects/${editingProject.id}`
        : `${API_BASE}/projects`;
      const method = editingProject ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save project.');

      closeModal();
      loadProjects();
      loadStats();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Status Transition directly from Card
  const handleQuickStatusChange = async (projectId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Status transition failed.');
      const data = await res.json();
      setProjects(prev => prev.map(p => p.id === projectId ? data.project : p));
      loadStats();
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete Project (Admin Only)
  const handleDeleteProject = async (projectId, projectName) => {
    if (!window.confirm(`Permanently decommission and delete "${projectName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete project.');
      }
      setProjects(prev => prev.filter(p => p.id !== projectId));
      loadStats();
    } catch (err) {
      alert(err.message);
    }
  };

  // Quick Client Creation
  const handleCreateClientSubmit = async (e) => {
    e.preventDefault();
    setClientFormError('');
    setIsSubmittingClient(true);

    try {
      const res = await fetch(`${API_BASE}/clients`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(clientForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create client.');

      const newCli = data.client;
      setClients(prev => [...prev, newCli]);
      setFormData(prev => ({ ...prev, client_id: newCli.id }));
      setClientModalOpen(false);
      setClientForm({ name: '', company: '', email: '', phone: '', notes: '' });
    } catch (err) {
      setClientFormError(err.message);
    } finally {
      setIsSubmittingClient(false);
    }
  };

  // Filtered Projects
  const filteredProjects = projects.filter(p => {
    if (statusFilter !== 'All' && p.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (selectedClientId !== 'All' && String(p.client_id) !== String(selectedClientId)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        (p.name || '').toLowerCase().includes(q) ||
        (p.code || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.client?.name || '').toLowerCase().includes(q) ||
        (p.client?.company || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getStatusBadgeClass = (statusStr) => {
    switch ((statusStr || '').toLowerCase()) {
      case 'in progress': return 'status-in-progress';
      case 'completed': return 'status-completed';
      case 'on hold': return 'status-on-hold';
      default: return 'status-not-started';
    }
  };

  return (
    <>
      {/* ── Hero Section ── */}
      <section className="services-hero">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <span className="hero-super-line">01 — STUDIO WORKSHOP PIPELINE</span>
              <h1 className="services-title">PROJECT<br /><span>OPERATIONS.</span></h1>
              <p className="hero-editorial-lead">
                Active commissions, game engineering deliverables, and technical milestones currently in progress across the studio's specialized disciplines.
              </p>
            </div>

            {canManageProjects && (
              <div style={{ alignSelf: 'center' }}>
                <button
                  className="btn-monograph"
                  onClick={openCreateModal}
                  id="btn-initiate-project"
                  style={{ fontSize: '0.95rem', padding: '14px 26px' }}
                >
                  + Initiate Project
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Main Operations Section ── */}
      <section style={{ paddingBottom: '80px' }}>
        <div className="container">

          {/* ── Architectural Metric Counters ── */}
          <div className="architectural-metrics-grid">
            <div className="architectural-metric-card">
              <span className="metric-datum-label">01 // IN WORKSHOP</span>
              <div className="metric-value-display" style={{ color: 'var(--green-botanical)' }}>
                {stats.in_progress}
              </div>
            </div>

            <div className="architectural-metric-card">
              <span className="metric-datum-label">02 // DELIVERED</span>
              <div className="metric-value-display">
                {stats.completed}
              </div>
            </div>

            <div className="architectural-metric-card">
              <span className="metric-datum-label">03 // ON HOLD</span>
              <div className="metric-value-display" style={{ color: '#8c6b2d' }}>
                {stats.on_hold}
              </div>
            </div>

            <div className="architectural-metric-card">
              <span className="metric-datum-label">04 // TOTAL COMMISSIONS</span>
              <div className="metric-value-display">
                {stats.total}
              </div>
            </div>
          </div>

          {/* ── Filter Toolbar ── */}
          <div className="monograph-filter-panel" style={{ background: 'var(--paper-white)', border: '1px solid var(--line-ink)', padding: '22px 26px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              
              {/* Status Tabs */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['All', ...STATUS_OPTIONS].map(statusName => {
                  const count = statusName === 'All'
                    ? projects.length
                    : projects.filter(p => p.status.toLowerCase() === statusName.toLowerCase()).length;
                  const isActive = statusFilter.toLowerCase() === statusName.toLowerCase();
                  return (
                    <button
                      key={statusName}
                      type="button"
                      id={`status-tab-${statusName.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => setStatusFilter(statusName)}
                      style={{
                        padding: '6px 14px',
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.82rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
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

              {/* Search & Client Filter */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end', minWidth: '280px' }}>
                {canManageProjects && clients.length > 0 && (
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid var(--line-muted)',
                      background: 'var(--paper-surface)',
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.82rem',
                      letterSpacing: '0.06em',
                      color: 'var(--ink-solid)',
                      outline: 'none'
                    }}
                  >
                    <option value="All">All Partner Orgs</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''}
                      </option>
                    ))}
                  </select>
                )}

                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', padding: '0 12px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="2" style={{ marginRight: '8px' }}>
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects by code, title, partner..."
                    style={{
                      padding: '8px 0',
                      border: 'none',
                      background: 'transparent',
                      fontFamily: 'inherit',
                      fontSize: '0.88rem',
                      color: 'var(--ink-solid)',
                      outline: 'none',
                      width: '200px'
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{ background: 'transparent', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer', fontFamily: 'monospace' }}
                    >
                      [✕]
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Projects Listing ── */}
          {loading && <p className="empty-note">Accessing studio project ledger…</p>}
          {error && <p className="empty-note" style={{ color: '#9c2f25' }}>{error}</p>}

          {!loading && !error && filteredProjects.length === 0 && (
            <div className="monograph-empty-state" style={{ background: 'var(--paper-white)', border: '1px dashed var(--line-ink)', padding: '50px 30px', textAlign: 'center' }}>
              <span className="hero-super-line">WORKSHOP PIPELINE</span>
              <h3 className="monograph-empty-title" style={{ marginTop: '8px' }}>NO ACTIVE PROJECTS RECORDED</h3>
              <p className="monograph-empty-desc" style={{ maxWidth: '520px', margin: '0 auto 24px' }}>
                There are currently no commissions matching your search parameters.
              </p>
              {canManageProjects && (
                <button
                  type="button"
                  className="btn-monograph"
                  onClick={openCreateModal}
                  style={{ fontSize: '0.85rem', padding: '10px 22px' }}
                >
                  Initiate First Project
                </button>
              )}
            </div>
          )}

          {!loading && !error && filteredProjects.length > 0 && (
            <div className="monograph-projects-grid">
              {filteredProjects.map(project => (
                <div key={project.id} className="monograph-project-card" id={`project-card-${project.id}`}>
                  {/* Card Header */}
                  <div className="project-card-top-bar">
                    <span className="project-code-tag">
                      {project.code || `PRJ-${String(project.id).padStart(2, '0')}`}
                    </span>

                    {/* Quick Status Control or Read-Only Badge */}
                    {canManageProjects ? (
                      <select
                        value={project.status}
                        onChange={(e) => handleQuickStatusChange(project.id, e.target.value)}
                        className={`architectural-status-badge ${getStatusBadgeClass(project.status)}`}
                        style={{ cursor: 'pointer', outline: 'none' }}
                      >
                        {STATUS_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`architectural-status-badge ${getStatusBadgeClass(project.status)}`}>
                        {project.status}
                      </span>
                    )}
                  </div>

                  {/* Title & Client */}
                  <h3 className="project-card-title">{project.name}</h3>

                  <div className="project-card-client">
                    <span>PARTNER //</span>
                    <strong style={{ color: 'var(--ink-solid)' }}>
                      {project.client?.name || 'DIRECT COMMISSION'}
                    </strong>
                    {project.client?.company && (
                      <span>({project.client.company})</span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="project-card-desc">
                    {project.description || 'No detailed scope briefing registered.'}
                  </p>

                  {/* Assigned Artisans / Engineers */}
                  <div className="project-card-roster">
                    <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', width: '100%', marginBottom: '2px' }}>
                      ASSIGNED TEAM //
                    </span>
                    {(project.team_members && project.team_members.length > 0) ? (
                      project.team_members.map(member => (
                        <span key={member.id} className="artisan-chip" title={member.email}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green-botanical)' }}></span>
                          {member.name}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
                        No studio leads assigned yet.
                      </span>
                    )}
                  </div>

                  {/* Card Footer: Timeline & Actions */}
                  <div className="project-card-footer">
                    <div>
                      {project.deadline && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--ink-muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>
                          DEADLINE: <strong style={{ color: 'var(--ink-solid)' }}>{project.deadline}</strong>
                        </div>
                      )}
                      {project.budget && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--green-botanical)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>
                          BUDGET: {project.budget}
                        </div>
                      )}
                    </div>

                    {canManageProjects && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(project)}
                          className="btn-monograph"
                          style={{ fontSize: '0.78rem', padding: '6px 12px', background: 'transparent' }}
                        >
                          Edit
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteProject(project.id, project.name)}
                            className="btn-monograph"
                            style={{ fontSize: '0.78rem', padding: '6px 12px', color: '#9c2f25', borderColor: '#9c2f25', background: 'transparent' }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Project Create / Edit Modal ── */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px', width: '92%' }}>
            <div className="modal-header">
              <div>
                <span className="hero-super-line">WORKSHOP LEDGER ENTRY</span>
                <h2 style={{ fontSize: '1.5rem', letterSpacing: '0.08em', margin: '4px 0 0 0' }}>
                  {editingProject ? 'UPDATE PROJECT' : 'INITIATE NEW PROJECT'}
                </h2>
              </div>
              <button className="modal-close-btn" onClick={closeModal} aria-label="Close modal">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitProject}>
              <div className="modal-body" style={{ padding: '24px 30px' }}>
                {formError && (
                  <div style={{ padding: '10px 14px', background: 'rgba(156, 47, 37, 0.08)', border: '1px solid #9c2f25', color: '#9c2f25', marginBottom: '18px', fontSize: '0.88rem' }}>
                    {formError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Project Title *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g. Aethelgard: Shader Pipeline"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', font: 'inherit', color: 'var(--ink-solid)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Project Code
                    </label>
                    <input
                      type="text"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      placeholder="e.g. PRJ-01"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', font: 'inherit', color: 'var(--ink-solid)' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Project Scope & Description
                  </label>
                  <textarea
                    name="description"
                    rows="3"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Milestone goals, architectural objectives, and deliverable scope..."
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', font: 'inherit', color: 'var(--ink-solid)', resize: 'vertical' }}
                  ></textarea>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Partner Client *
                      </label>
                      <button
                        type="button"
                        onClick={() => setClientModalOpen(true)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--green-botanical)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}
                      >
                        + New Partner
                      </button>
                    </div>
                    <select
                      name="client_id"
                      required
                      value={formData.client_id}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', font: 'inherit', color: 'var(--ink-solid)' }}
                    >
                      <option value="">Select Partner Organization...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.company ? `(${c.company})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Lifecycle Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', font: 'inherit', color: 'var(--ink-solid)' }}
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '22px' }}>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', font: 'inherit', color: 'var(--ink-solid)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Delivery Deadline
                    </label>
                    <input
                      type="date"
                      name="deadline"
                      value={formData.deadline}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', font: 'inherit', color: 'var(--ink-solid)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Contract / Budget
                    </label>
                    <input
                      type="text"
                      name="budget"
                      value={formData.budget}
                      onChange={handleInputChange}
                      placeholder="e.g. $25,000 USD"
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', font: 'inherit', color: 'var(--ink-solid)' }}
                    />
                  </div>
                </div>

                {/* Team Members Multi-Select Assignment */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Assign Studio Engineers & Artisans
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--line-muted)', padding: '10px', background: 'var(--paper-surface)' }}>
                    {teamMembers.map(member => {
                      const isAssigned = formData.team_member_ids.includes(member.id);
                      return (
                        <label
                          key={member.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 8px',
                            background: isAssigned ? 'var(--green-wash)' : 'var(--paper-white)',
                            border: '1px solid',
                            borderColor: isAssigned ? 'var(--green-botanical)' : 'var(--line-muted)',
                            cursor: 'pointer',
                            fontSize: '0.82rem'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => handleMemberToggle(member.id)}
                          />
                          <span style={{ fontWeight: isAssigned ? 600 : 400 }}>
                            {member.first_name} {member.last_name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 30px', borderTop: '1px solid var(--line-muted)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-monograph"
                  style={{ background: 'transparent', color: 'var(--ink-solid)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-monograph"
                >
                  {isSubmitting ? 'Recording Entry...' : (editingProject ? 'Save Changes' : 'Initialize Project')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Quick Client Creation Modal ── */}
      {clientModalOpen && (
        <div className="modal-backdrop" onClick={() => setClientModalOpen(false)} style={{ zIndex: 1100 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '92%' }}>
            <div className="modal-header">
              <div>
                <span className="hero-super-line">CLIENT DIRECTORY</span>
                <h2 style={{ fontSize: '1.3rem', letterSpacing: '0.08em', margin: '4px 0 0 0' }}>
                  REGISTER PARTNER ORG
                </h2>
              </div>
              <button className="modal-close-btn" onClick={() => setClientModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClientSubmit}>
              <div className="modal-body" style={{ padding: '20px 26px' }}>
                {clientFormError && (
                  <div style={{ padding: '8px 12px', background: 'rgba(156, 47, 37, 0.08)', color: '#9c2f25', marginBottom: '14px', fontSize: '0.85rem' }}>
                    {clientFormError}
                  </div>
                )}

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientForm.name}
                    onChange={e => setClientForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Sarah Connor"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    value={clientForm.company}
                    onChange={e => setClientForm(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="e.g. Apex Interactive Ltd"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
                    Email Contact *
                  </label>
                  <input
                    type="email"
                    required
                    value={clientForm.email}
                    onChange={e => setClientForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="e.g. contact@apex.com"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
                    Phone Contact
                  </label>
                  <input
                    type="text"
                    value={clientForm.phone}
                    onChange={e => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="e.g. +1 555 0199"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)' }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '14px 26px', borderTop: '1px solid var(--line-muted)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setClientModalOpen(false)}
                  className="btn-monograph"
                  style={{ background: 'transparent', color: 'var(--ink-solid)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClient}
                  className="btn-monograph"
                >
                  {isSubmittingClient ? 'Saving...' : 'Add Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Projects;
