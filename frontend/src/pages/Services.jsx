import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE, apiClient } from '../services/api';

const Services = () => {
  const { user, token } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Search & Filter State (Task 8) ──
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPricing, setSelectedPricing] = useState('all');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [categories, setCategories] = useState([]);
  const [pricingOptions, setPricingOptions] = useState([]);
  const [sortOptions, setSortOptions] = useState([]);

  // ── Request Modal State ──
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    service_title: '',
    service_id: '',
    priority: 'Normal',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [formError, setFormError] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [uploadedDocInfo, setUploadedDocInfo] = useState(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load filter metadata once from backend
  useEffect(() => {
    fetch(`${API_BASE}/services/meta`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          if (data.categories) setCategories(['All', ...data.categories]);
          if (data.pricing_options) setPricingOptions(data.pricing_options);
          if (data.sort_options) setSortOptions(data.sort_options);
        }
      })
      .catch(err => console.error('Failed to load services metadata', err));
  }, []);

  // Fetch filtered services directly from backend API
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
    if (selectedCategory && selectedCategory !== 'All') params.append('category', selectedCategory);
    if (selectedPricing && selectedPricing !== 'all') params.append('pricing', selectedPricing);
    if (selectedSort) params.append('sort', selectedSort);

    fetch(`${API_BASE}/services?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error('Unable to load services.');
        return res.json();
      })
      .then(data => {
        setServices(data);
        setError('');
      })
      .catch(() => setError('The studio API is unavailable right now. Please try again later.'))
      .finally(() => setLoading(false));
  }, [debouncedSearch, selectedCategory, selectedPricing, selectedSort]);

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedCategory('All');
    setSelectedPricing('all');
    setSelectedSort('newest');
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
    (selectedCategory && selectedCategory !== 'All') ||
    (selectedPricing && selectedPricing !== 'all') ||
    selectedSort !== 'newest'
  );

  const openRequestModal = (service = null) => {
    setFormError('');
    setSubmissionResult(null);
    setAttachedFile(null);
    setUploadedDocInfo(null);
    setFormData({
      name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '',
      email: user?.email || '',
      phone: user?.phone || '',
      company: '',
      service_title: service ? service.title : (services[0]?.title || 'Custom Service'),
      service_id: service ? service.id : '',
      priority: 'Normal',
      message: ''
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSubmissionResult(null);
    setFormError('');
    setAttachedFile(null);
    setUploadedDocInfo(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'service_title') {
      const matched = services.find(s => s.title === value);
      setFormData(prev => ({
        ...prev,
        service_title: value,
        service_id: matched ? matched.id : ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || null,
      company: formData.company.trim() || null,
      service_title: formData.service_title.trim(),
      service_id: formData.service_id ? parseInt(formData.service_id, 10) : null,
      priority: formData.priority,
      message: formData.message.trim()
    };

    if (!payload.name) {
      setFormError('Please provide your name.');
      setSubmitting(false);
      return;
    }
    if (!payload.email) {
      setFormError('Please provide your email address.');
      setSubmitting(false);
      return;
    }
    if (!payload.service_title) {
      setFormError('Please select or specify a service.');
      setSubmitting(false);
      return;
    }
    if (payload.message.length < 5) {
      setFormError('Please provide at least a brief description of your project requirements.');
      setSubmitting(false);
      return;
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit service request.');
      }

      // If a file was attached and user is logged in, upload and link directly to the new request
      if (attachedFile && token && data.id) {
        try {
          const uploadData = new FormData();
          uploadData.append('file', attachedFile);
          uploadData.append('request_id', data.id);
          uploadData.append('title', `${data.service_title} — Brief`);
          uploadData.append('category', 'Project Brief');
          const docRes = await apiClient.upload('/documents/upload', uploadData);
          if (docRes.ok) {
            const docInfo = await docRes.json();
            setUploadedDocInfo(docInfo);
          }
        } catch (uploadErr) {
          console.warn('Could not automatically attach file to request:', uploadErr);
        }
      }

      setSubmissionResult(data);
    } catch (err) {
      setFormError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="services-hero">
        <div className="container">
          <span className="hero-super-line">01 — COMMISSION SPECIFICATIONS</span>
          <h1 className="services-title">STUDIO<br /><span>DISCIPLINES.</span></h1>
          <p className="hero-editorial-lead">
            Every world, mechanic, and acoustic environment in our studio is crafted by hand — from pencil concept sketches to bare-metal shader architecture. We partner with teams on bespoke commissions and deep technical engagements.
          </p>
          <div style={{ marginTop: '28px' }}>
            <button
              className="btn-monograph"
              onClick={() => openRequestModal(null)}
              id="btn-custom-commission"
              style={{ fontSize: '0.95rem', padding: '14px 28px' }}
            >
              + Submit Commission Brief
            </button>
          </div>
        </div>
      </section>

      <section style={{ paddingBottom: '70px' }}>
        <div className="container">

          {/* ── Monograph Search & Multi-Criteria Filtering Panel ── */}
          <div className="monograph-filter-panel" style={{ background: 'var(--paper-white)', border: '1px solid var(--line-ink)', padding: '24px 28px', marginBottom: '36px' }}>
            <div className="search-and-controls-grid">
              
              {/* Keyword Search Input with Geometric Search Glyph */}
              <div className="monograph-search-box" style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', padding: '0 14px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="2" style={{ flexShrink: 0, marginRight: '10px' }}>
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  id="services-search-input"
                  className="monograph-search-input"
                  placeholder="Search specifications by keyword, discipline, or scope…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ border: 'none', background: 'transparent', width: '100%', padding: '12px 0', outline: 'none', font: 'inherit', color: 'var(--ink-solid)' }}
                />
                {search && (
                  <button
                    type="button"
                    className="monograph-search-clear"
                    onClick={() => setSearch('')}
                    title="Clear search"
                    id="services-search-clear"
                    style={{ background: 'transparent', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer', fontFamily: 'monospace', fontSize: '1rem' }}
                  >
                    [✕]
                  </button>
                )}
              </div>

              {/* Multi-Criteria Controls: Pricing & Sorting */}
              <div className="filter-dropdowns-group">
                <div className="filter-field">
                  <label htmlFor="services-pricing-select" style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px', color: 'var(--ink-muted)' }}>Engagement Model</label>
                  <select
                    id="services-pricing-select"
                    className="monograph-select"
                    value={selectedPricing}
                    onChange={(e) => setSelectedPricing(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', color: 'var(--ink-solid)', font: 'inherit' }}
                  >
                    {pricingOptions.length > 0 ? (
                      pricingOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))
                    ) : (
                      <>
                        <option value="all">All Pricing Models</option>
                        <option value="quote">Custom Quote / Commission</option>
                        <option value="fixed">Fixed / Tiered Pricing</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="filter-field">
                  <label htmlFor="services-sort-select" style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px', color: 'var(--ink-muted)' }}>Order By</label>
                  <select
                    id="services-sort-select"
                    className="monograph-select"
                    value={selectedSort}
                    onChange={(e) => setSelectedSort(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', color: 'var(--ink-solid)', font: 'inherit' }}
                  >
                    {sortOptions.length > 0 ? (
                      sortOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))
                    ) : (
                      <>
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="alpha_asc">Alphabetical (A–Z)</option>
                        <option value="alpha_desc">Alphabetical (Z–A)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Discipline Category Tabs */}
            <div className="monograph-chips-bar" style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <span className="monograph-chip-label" style={{ fontFamily: 'var(--font-display)', fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginRight: '6px' }}>DISCIPLINE:</span>
              {(categories.length > 0 ? categories : ['All', 'Game Engineering', 'Visual Art & Design', 'Audio & Sound', 'QA & Evaluation']).map(cat => (
                <button
                  key={cat}
                  type="button"
                  id={`cat-chip-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  className={`monograph-chip ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '6px 14px',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.82rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    border: '1px solid var(--line-ink)',
                    background: selectedCategory === cat ? 'var(--ink-solid)' : 'var(--paper-surface)',
                    color: selectedCategory === cat ? 'var(--paper-white)' : 'var(--ink-solid)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Live Results Counter & Reset Action */}
            <div className="monograph-meta-row" style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--line-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div className="results-count-text" style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)' }}>
                DISCIPLINES CATALOG: <strong style={{ color: 'var(--ink-solid)' }}>{services.length}</strong> {services.length === 1 ? 'OFFERING' : 'OFFERINGS'}
                {debouncedSearch && <span> MATCHING “<em>{debouncedSearch}</em>”</span>}
                {selectedCategory !== 'All' && <span> IN <strong style={{ color: 'var(--green-botanical)' }}>{selectedCategory.toUpperCase()}</strong></span>}
                {selectedPricing !== 'all' && (
                  <span> ({selectedPricing === 'quote' ? 'CUSTOM QUOTE' : 'TIERED'})</span>
                )}
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  id="btn-reset-service-filters"
                  className="btn-reset-filters"
                  onClick={handleResetFilters}
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.8rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '4px 10px',
                    border: '1px solid var(--line-ink)',
                    background: 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  Reset Filters [✕]
                </button>
              )}
            </div>
          </div>

          {loading && <p className="empty-note">Loading studio specifications…</p>}
          {error && <p className="empty-note" style={{ color: '#9c2f25' }}>{error}</p>}

          {/* Zero Results State */}
          {!loading && !error && services.length === 0 && (
            <div className="monograph-empty-state" style={{ background: 'var(--paper-white)', border: '1px dashed var(--line-ink)', padding: '50px 30px', textAlign: 'center' }}>
              <span className="hero-super-line">SPECIFICATION QUERY</span>
              <h3 className="monograph-empty-title" style={{ marginTop: '8px' }}>NO MATCHING DISCIPLINES CATALOGUED</h3>
              <p className="monograph-empty-desc" style={{ maxWidth: '520px', margin: '0 auto 24px' }}>
                We could not locate any active studio offerings matching your selected parameters. Adjust your search keywords or clear discipline filters.
              </p>
              <button
                type="button"
                className="btn-monograph"
                onClick={handleResetFilters}
                style={{ fontSize: '0.85rem', padding: '10px 22px' }}
              >
                Clear All Search & Filters
              </button>
            </div>
          )}

          {/* Service Cards Grid — Handcrafted Architectural Commission Studies */}
          {!loading && !error && services.length > 0 && (
            <div className="monograph-projects-grid">
              {services.map((service, index) => (
                <div
                  key={service.id}
                  className="monograph-project-card"
                  id={`service-study-${service.id}`}
                >
                  <div className="project-card-top-bar">
                    <span className="technical-discipline-tag">
                      {service.category || 'STUDIO DISCIPLINE'}
                    </span>
                    <span className="project-code-tag">
                      SPEC // {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <h3 className="project-card-title">{service.title}</h3>

                  <p className="project-card-desc">
                    {service.description}
                  </p>
                  
                  <div className="project-card-footer">
                    <div>
                      <span style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                        ENGAGEMENT MODEL
                      </span>
                      <strong style={{ fontFamily: 'var(--font-display)', fontSize: '0.92rem', letterSpacing: '0.06em', color: 'var(--green-botanical)' }}>
                        {service.price || 'COMMISSION / QUOTE'}
                      </strong>
                    </div>

                    <button
                      className="btn-monograph"
                      onClick={() => openRequestModal(service)}
                      id={`request-btn-${service.id}`}
                      style={{ fontSize: '0.82rem', padding: '8px 16px' }}
                    >
                      Initialize Brief →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bespoke Project Prompt */}
          <div className="service-custom-banner" style={{
            marginTop: '56px',
            padding: '36px',
            background: 'var(--paper-white)',
            border: '1px solid var(--line-ink)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '24px',
            position: 'relative'
          }}>
            <div style={{ position: 'absolute', top: '4px', left: '6px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--ink-muted)' }}>+</div>
            <div style={{ position: 'absolute', bottom: '4px', right: '6px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--ink-muted)' }}>+</div>
            <div>
              <span className="hero-super-line" style={{ display: 'block', marginBottom: '6px' }}>BESPOKE COMMISSIONS & R&D</span>
              <h3 style={{ fontSize: '1.4rem', letterSpacing: '0.06em', margin: '0 0 8px 0' }}>HAVE A UNIQUE OR MULTI-DISCIPLINARY INQUIRY?</h3>
              <p style={{ margin: 0, color: 'var(--ink-secondary)', maxWidth: '640px', lineHeight: 1.6, fontFamily: 'var(--font-editorial)' }}>
                We accept tailored project briefs for game prototypes, audio suites, visual art systems, and engineering consulting. Submit a detailed request and our directors will prepare a scope analysis.
              </p>
            </div>
            <button
              className="btn-monograph"
              onClick={() => openRequestModal(null)}
              style={{ padding: '14px 26px', whiteSpace: 'nowrap' }}
            >
              Start Custom Brief
            </button>
          </div>
        </div>
      </section>

      {/* ── Customer Request Modal ── */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '640px', width: '92%' }}
          >
            <div className="modal-header">
              <div>
                <span className="hero-super-line">STUDIO COMMISSION</span>
                <h2 style={{ fontSize: '1.5rem', letterSpacing: '0.08em', margin: '4px 0 0 0' }}>
                  {submissionResult ? 'COMMISSION INQUIRY LOGGED' : 'SUBMIT SERVICE REQUEST'}
                </h2>
              </div>
              <button
                className="modal-close-btn"
                onClick={closeModal}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ padding: '24px 30px' }}>
              {submissionResult ? (
                /* Success State */
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', letterSpacing: '0.12em', color: 'var(--green-botanical)', marginBottom: '12px' }}>
                    [RECORD VERIFIED // #SR-{submissionResult.id}]
                  </div>
                  <span className="architectural-status-badge status-pending" style={{ fontSize: '0.82rem', marginBottom: '14px' }}>
                    STATUS // PENDING STUDIO REVIEW
                  </span>
                  <h3 style={{ fontSize: '1.4rem', letterSpacing: '0.06em', marginBottom: '12px' }}>
                    Request #{submissionResult.id} Logged Successfully
                  </h3>
                  <p style={{ color: 'var(--ink-secondary)', lineHeight: 1.7, maxWidth: '480px', margin: '0 auto 24px' }}>
                    Thank you, <strong>{submissionResult.name}</strong>. Your request for{' '}
                    <strong>{submissionResult.service_title}</strong> has been assigned reference{' '}
                    <code>#SR-{submissionResult.id}</code>. Our studio leads review submissions within 24–48 hours.
                  </p>

                  <div style={{
                    background: 'var(--paper-surface)',
                    border: '1px solid var(--line-muted)',
                    padding: '16px 20px',
                    textAlign: 'left',
                    marginBottom: '28px',
                    fontSize: '0.92rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--ink-muted)' }}>Service:</span>
                      <strong>{submissionResult.service_title}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--ink-muted)' }}>Email:</span>
                      <span>{submissionResult.email}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--ink-muted)' }}>Priority:</span>
                      <span className={`badge-priority badge-priority-${submissionResult.priority.toLowerCase()}`}>
                        {submissionResult.priority}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--ink-muted)' }}>Submitted:</span>
                      <span>{new Date(submissionResult.created_at).toLocaleString()}</span>
                    </div>

                    {uploadedDocInfo && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--line-muted)' }}>
                        <span style={{ color: 'var(--ink-muted)' }}>Attached Asset:</span>
                        <strong style={{ color: 'var(--green-botanical)' }}>
                          📎 {uploadedDocInfo.filename} ({uploadedDocInfo.file_size_formatted})
                        </strong>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {user ? (
                      <>
                        <Link to="/dashboard" className="btn-monograph" onClick={closeModal}>
                          Track In Dashboard →
                        </Link>
                        <Link to="/documents" className="btn-monograph" onClick={closeModal} style={{ background: 'transparent', color: 'var(--ink-solid)' }}>
                          View In Archive →
                        </Link>
                      </>
                    ) : (
                      <Link to="/register" className="btn-monograph" onClick={closeModal}>
                        Create Account to Track →
                      </Link>
                    )}
                    <button
                      className="btn-monograph"
                      onClick={() => openRequestModal(null)}
                      style={{ background: 'transparent', color: 'var(--ink-solid)' }}
                    >
                      Submit Another Request
                    </button>
                  </div>
                </div>
              ) : (
                /* Form State */
                <form onSubmit={handleSubmitRequest}>
                  {user ? (
                    <div style={{
                      background: 'rgba(27, 77, 52, 0.06)',
                      border: '1px solid var(--green-botanical)',
                      padding: '10px 14px',
                      fontSize: '0.85rem',
                      marginBottom: '20px',
                      color: 'var(--ink-solid)'
                    }}>
                      Submitting as signed-in member: <strong>{user.email}</strong>. This request will automatically appear in your personal dashboard.
                    </div>
                  ) : (
                    <div style={{
                      background: 'var(--paper-surface)',
                      border: '1px solid var(--line-muted)',
                      padding: '10px 14px',
                      fontSize: '0.85rem',
                      marginBottom: '20px',
                      color: 'var(--ink-secondary)'
                    }}>
                      Guest submission. You can also <Link to="/login" style={{ textDecoration: 'underline', color: 'var(--green-botanical)' }}>log in</Link> to track request statuses in real time.
                    </div>
                  )}

                  {formError && (
                    <div style={{
                      background: '#faeae8',
                      border: '1px solid #9c2f25',
                      color: '#9c2f25',
                      padding: '10px 14px',
                      fontSize: '0.9rem',
                      marginBottom: '18px'
                    }}>
                      {formError}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="admin-field">
                      <label className="modal-label">Your Name <span style={{ color: '#9c2f25' }}>*</span></label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        maxLength="100"
                        placeholder="e.g. Elena Vance"
                        className="modal-input"
                      />
                    </div>
                    <div className="admin-field">
                      <label className="modal-label">Email Address <span style={{ color: '#9c2f25' }}>*</span></label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        maxLength="120"
                        placeholder="elena@example.com"
                        className="modal-input"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="admin-field">
                      <label className="modal-label">Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        maxLength="50"
                        placeholder="+1 555-010-9999"
                        className="modal-input"
                      />
                    </div>
                    <div className="admin-field">
                      <label className="modal-label">Organization / Studio</label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        maxLength="150"
                        placeholder="Company or independent"
                        className="modal-input"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="admin-field">
                      <label className="modal-label">Service Type <span style={{ color: '#9c2f25' }}>*</span></label>
                      <select
                        name="service_title"
                        value={formData.service_title}
                        onChange={handleInputChange}
                        required
                        className="modal-input"
                      >
                        {services.map(s => (
                          <option key={s.id} value={s.title}>{s.title}</option>
                        ))}
                        <option value="Custom Game Development">Custom Game Development</option>
                        <option value="Custom Visual / Architectural System">Custom Visual / Architectural System</option>
                        <option value="Audio Production & Voiceover">Audio Production & Voiceover</option>
                        <option value="General Commission Inquiry">General Commission Inquiry</option>
                      </select>
                    </div>

                    <div className="admin-field">
                      <label className="modal-label">Priority / Timeline</label>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        className="modal-input"
                      >
                        <option value="Normal">Normal Timeline</option>
                        <option value="Urgent">Urgent / Rush</option>
                        <option value="High">High Priority</option>
                        <option value="Low">Low / Flexible</option>
                      </select>
                    </div>
                  </div>

                  <div className="admin-field" style={{ marginBottom: '22px' }}>
                    <label className="modal-label">
                      Project Scope & Requirements <span style={{ color: '#9c2f25' }}>*</span>
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows="4"
                      placeholder="Outline your project goals, desired deliverables, target timeline, technical stack, or any reference materials..."
                      className="modal-input"
                      style={{ resize: 'vertical', minHeight: '110px' }}
                    ></textarea>
                  </div>

                  {/* ── Optional Project File Attachment (Task 10) ── */}
                  <div className="admin-field" style={{ marginBottom: '22px' }}>
                    <label className="modal-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <span>Attach Project Brief / Reference Asset (Optional)</span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--ink-muted)', textTransform: 'none', fontFamily: 'var(--font-sans)' }}>
                        Max 25MB · PDF, DOCX, PNG, MP3, WAV, ZIP, BLEND
                      </span>
                    </label>

                    {user ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        background: 'var(--paper-surface)',
                        border: '1px solid var(--line-muted)'
                      }}>
                        <input
                          type="file"
                          id="service-request-file-input"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const f = e.target.files[0];
                              if (f.size > 25 * 1024 * 1024) {
                                setFormError('Attached file exceeds maximum permitted size of 25MB.');
                                return;
                              }
                              setFormError('');
                              setAttachedFile(f);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById('service-request-file-input').click()}
                          className="btn-monograph"
                          style={{ padding: '6px 14px', fontSize: '0.82rem', background: 'var(--paper-white)' }}
                        >
                          {attachedFile ? 'Change File' : 'Browse File…'}
                        </button>

                        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.88rem' }}>
                          {attachedFile ? (
                            <span style={{ color: 'var(--green-botanical)', fontWeight: 600 }}>
                              📎 {attachedFile.name} ({(attachedFile.size / (1024 * 1024)).toFixed(2)} MB)
                            </span>
                          ) : (
                            <span style={{ color: 'var(--ink-muted)' }}>
                              No file selected. Upload a GDD, reference track, or concept brief.
                            </span>
                          )}
                        </div>

                        {attachedFile && (
                          <button
                            type="button"
                            onClick={() => setAttachedFile(null)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#9c2f25',
                              cursor: 'pointer',
                              fontSize: '1rem',
                              padding: '0 4px'
                            }}
                            title="Remove attachment"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        padding: '10px 14px',
                        background: 'var(--paper-surface)',
                        border: '1px dashed var(--line-muted)',
                        fontSize: '0.84rem',
                        color: 'var(--ink-secondary)'
                      }}>
                        <span>
                          🔒 <Link to="/login" style={{ textDecoration: 'underline', color: 'var(--green-botanical)' }}>Log in</Link> to attach project briefs or audio stems directly with this quote request.
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn-monograph"
                      onClick={closeModal}
                      style={{ background: 'transparent', color: 'var(--ink-solid)' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-monograph"
                      disabled={submitting}
                      id="btn-submit-service-request"
                    >
                      {submitting ? 'Transmitting Request…' : 'Submit Request →'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Services;
