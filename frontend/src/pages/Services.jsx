import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../services/api';

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
          <span className="hero-super-line">WHAT WE OFFER</span>
          <h1 className="services-title">OUR<br /><span>SERVICES.</span></h1>
          <p className="hero-editorial-lead">
            Everything we do is built by hand — from concept art to final code. Here's how we can help bring your vision to life.
          </p>
          <div style={{ marginTop: '28px' }}>
            <button
              className="btn-monograph"
              onClick={() => openRequestModal(null)}
              id="btn-custom-commission"
              style={{ fontSize: '1rem', padding: '14px 28px' }}
            >
              + Submit Service Request
            </button>
          </div>
        </div>
      </section>

      <section style={{ paddingBottom: '60px' }}>
        <div className="container">

          {/* ── Monograph Search & Multi-Criteria Filtering Panel (Task 8) ── */}
          <div className="monograph-filter-panel">
            <div className="search-and-controls-grid">
              
              {/* Keyword Search Input */}
              <div className="monograph-search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  id="services-search-input"
                  className="monograph-search-input"
                  placeholder="Search services by keyword, discipline, or description…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    className="monograph-search-clear"
                    onClick={() => setSearch('')}
                    title="Clear search"
                    id="services-search-clear"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Multi-Criteria Controls: Pricing & Sorting */}
              <div className="filter-dropdowns-group">
                <div className="filter-field">
                  <label htmlFor="services-pricing-select">Engagement Model</label>
                  <select
                    id="services-pricing-select"
                    className="monograph-select"
                    value={selectedPricing}
                    onChange={(e) => setSelectedPricing(e.target.value)}
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
                  <label htmlFor="services-sort-select">Sort Order</label>
                  <select
                    id="services-sort-select"
                    className="monograph-select"
                    value={selectedSort}
                    onChange={(e) => setSelectedSort(e.target.value)}
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

            {/* Discipline Category Chips */}
            <div className="monograph-chips-bar">
              <span className="monograph-chip-label">Discipline:</span>
              {(categories.length > 0 ? categories : ['All', 'Game Engineering', 'Visual Art & Design', 'Audio & Sound', 'QA & Evaluation']).map(cat => (
                <button
                  key={cat}
                  type="button"
                  id={`cat-chip-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  className={`monograph-chip ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Live Results Counter & Reset Action */}
            <div className="monograph-meta-row">
              <div className="results-count-text">
                Showing <span className="results-count-number">{services.length}</span> {services.length === 1 ? 'service' : 'services'}
                {debouncedSearch && <span> matching “<em>{debouncedSearch}</em>”</span>}
                {selectedCategory !== 'All' && <span> in <strong>{selectedCategory}</strong></span>}
                {selectedPricing !== 'all' && (
                  <span> ({selectedPricing === 'quote' ? 'Custom Quote' : 'Fixed/Tiered'})</span>
                )}
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  id="btn-reset-service-filters"
                  className="btn-reset-filters"
                  onClick={handleResetFilters}
                >
                  ↺ Reset Filters
                </button>
              )}
            </div>
          </div>

          {loading && <p className="empty-note">Filtering and loading services…</p>}
          {error && <p className="empty-note">{error}</p>}

          {/* Zero Results State */}
          {!loading && !error && services.length === 0 && (
            <div className="monograph-empty-state">
              <div className="monograph-empty-icon">🔍</div>
              <h3 className="monograph-empty-title">NO MATCHING SERVICES FOUND</h3>
              <p className="monograph-empty-desc">
                We couldn't find any services matching your search and filter parameters. Try clearing your filters or exploring our other disciplines.
              </p>
              <button
                type="button"
                className="btn-monograph"
                onClick={handleResetFilters}
                style={{ fontSize: '0.88rem', padding: '10px 20px' }}
              >
                Clear All Search & Filters
              </button>
            </div>
          )}

          {/* Service Cards Grid */}
          {!loading && !error && services.length > 0 && (
            <div className="service-grid">
              {services.map(service => (
                <div key={service.id} className="service-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    {service.category && (
                      <span className="monograph-category-tag">{service.category}</span>
                    )}
                    {service.icon && (
                      <div className="service-card-icon" style={{ marginBottom: '8px' }}>{service.icon}</div>
                    )}
                  </div>
                  <h3 className="service-card-title">{service.title}</h3>
                  <p className="service-card-description">{service.description}</p>
                  
                  <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line-muted)' }}>
                    {service.price && (
                      <div className="service-card-price" style={{ borderTop: 'none', paddingTop: 0 }}>
                        {service.price}
                      </div>
                    )}
                    <button
                      className="btn-monograph"
                      onClick={() => openRequestModal(service)}
                      id={`request-btn-${service.id}`}
                      style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                    >
                      Request Service →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bespoke Project Prompt */}
          <div className="service-custom-banner" style={{
            marginTop: '50px',
            padding: '36px',
            background: 'var(--paper-white)',
            border: '1px solid var(--line-ink)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '24px'
          }}>
            <div>
              <span className="hero-super-line" style={{ display: 'block', marginBottom: '6px' }}>BESPOKE COMMISSIONS</span>
              <h3 style={{ fontSize: '1.4rem', letterSpacing: '0.06em', margin: '0 0 8px 0' }}>HAVE A UNIQUE OR MULTI-DISCIPLINARY PROJECT?</h3>
              <p style={{ margin: 0, color: 'var(--ink-secondary)', maxWidth: '640px', lineHeight: 1.6 }}>
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
                  {submissionResult ? 'REQUEST RECEIVED' : 'SUBMIT SERVICE REQUEST'}
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
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✦</div>
                  <span className="request-status-badge badge-pending" style={{ fontSize: '0.85rem', marginBottom: '14px' }}>
                    STATUS: PENDING REVIEW
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
                  </div>

                  <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {user ? (
                      <Link to="/dashboard" className="btn-monograph" onClick={closeModal}>
                        Track In Dashboard →
                      </Link>
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
