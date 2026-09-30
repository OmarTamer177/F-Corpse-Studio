import React, { useEffect, useState } from 'react';
import { API_BASE } from '../services/api';

const Blogs = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Search & Filter State (Task 8) ──
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAuthor, setSelectedAuthor] = useState('All');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [sortOptions, setSortOptions] = useState([]);

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load blog filter metadata from backend
  useEffect(() => {
    fetch(`${API_BASE}/blogs/meta`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          if (data.categories) setCategories(['All', ...data.categories]);
          if (data.authors) setAuthors(['All', ...data.authors]);
          if (data.sort_options) setSortOptions(data.sort_options);
        }
      })
      .catch(err => console.error('Failed to load blogs metadata', err));
  }, []);

  // Fetch filtered blog dispatches directly from backend API
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
    if (selectedCategory && selectedCategory !== 'All') params.append('category', selectedCategory);
    if (selectedAuthor && selectedAuthor !== 'All') params.append('author', selectedAuthor);
    if (selectedSort) params.append('sort', selectedSort);

    fetch(`${API_BASE}/blogs?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error('Unable to load posts.');
        return res.json();
      })
      .then(data => {
        setPosts(data);
        setError('');
      })
      .catch(() => setError('The studio API is unavailable right now. Please try again later.'))
      .finally(() => setLoading(false));
  }, [debouncedSearch, selectedCategory, selectedAuthor, selectedSort]);

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedCategory('All');
    setSelectedAuthor('All');
    setSelectedSort('newest');
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
    (selectedCategory && selectedCategory !== 'All') ||
    (selectedAuthor && selectedAuthor !== 'All') ||
    selectedSort !== 'newest'
  );

  return (
    <>
      <section className="contact-hero">
        <div className="container">
          <span className="hero-super-line">FROM THE WORKSHOP</span>
          <h1 className="contact-title">STUDIO<br /><span>DISPATCHES.</span></h1>
          <p className="hero-editorial-lead">Notes, progress updates, and engineering thoughts from the team as the debut project takes shape.</p>
        </div>
      </section>

      <section style={{ paddingBottom: '70px' }}>
        <div className="container">

          {/* ── Monograph Search & Multi-Criteria Filtering Panel (Task 8) ── */}
          <div className="monograph-filter-panel">
            <div className="search-and-controls-grid">
              
              {/* Keyword Search Input */}
              <div className="monograph-search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  id="blogs-search-input"
                  className="monograph-search-input"
                  placeholder="Search dispatches by title, author, or keywords…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    className="monograph-search-clear"
                    onClick={() => setSearch('')}
                    title="Clear search"
                    id="blogs-search-clear"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Multi-Criteria Controls: Author & Sorting */}
              <div className="filter-dropdowns-group">
                <div className="filter-field">
                  <label htmlFor="blogs-author-select">Author</label>
                  <select
                    id="blogs-author-select"
                    className="monograph-select"
                    value={selectedAuthor}
                    onChange={(e) => setSelectedAuthor(e.target.value)}
                  >
                    {(authors.length > 0 ? authors : ['All', 'Admin', 'Elena Vance', 'Marcus Thorne']).map(author => (
                      <option key={author} value={author}>
                        {author === 'All' ? 'All Authors' : author}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label htmlFor="blogs-sort-select">Sort Order</label>
                  <select
                    id="blogs-sort-select"
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
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Topic Category Chips */}
            <div className="monograph-chips-bar">
              <span className="monograph-chip-label">Topic:</span>
              {(categories.length > 0 ? categories : ['All', 'Engineering', 'Art Direction', 'Audio', 'Studio News']).map(cat => (
                <button
                  key={cat}
                  type="button"
                  id={`blog-cat-chip-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
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
                Showing <span className="results-count-number">{posts.length}</span> {posts.length === 1 ? 'dispatch' : 'dispatches'}
                {debouncedSearch && <span> matching “<em>{debouncedSearch}</em>”</span>}
                {selectedCategory !== 'All' && <span> in <strong>{selectedCategory}</strong></span>}
                {selectedAuthor !== 'All' && <span> by <strong>{selectedAuthor}</strong></span>}
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  id="btn-reset-blog-filters"
                  className="btn-reset-filters"
                  onClick={handleResetFilters}
                >
                  ↺ Reset Filters
                </button>
              )}
            </div>
          </div>

          <div className="blog-list" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {loading && <p className="empty-note">Filtering and loading dispatches…</p>}
            {error && <p className="empty-note">{error}</p>}
            
            {/* Zero Results State */}
            {!loading && !error && posts.length === 0 && (
              <div className="monograph-empty-state">
                <div className="monograph-empty-icon">📜</div>
                <h3 className="monograph-empty-title">NO DISPATCHES FOUND</h3>
                <p className="monograph-empty-desc">
                  No studio dispatches matched your current search and filter combination. Try clearing your query or selecting another topic.
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

            {!loading && !error && posts.map(post => (
              <article key={post.id} className="blog-card" style={{ border: '1px solid var(--line-ink)', background: 'var(--paper-white)', padding: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  {post.category && (
                    <span className="monograph-category-tag">{post.category}</span>
                  )}
                </div>
                <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '0.06em', marginBottom: '8px' }}>{post.title}</h2>
                <div className="blog-card-meta" style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.1em', color: 'var(--green-botanical)', textTransform: 'uppercase', marginBottom: '16px' }}>
                  {new Date(post.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  {post.author ? ` · ${post.author}` : ''}
                </div>
                <div className="blog-card-body" style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.08rem', color: 'var(--ink-secondary)', lineHeight: '1.75', whiteSpace: 'pre-wrap' }}>
                  {post.content}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default Blogs;
