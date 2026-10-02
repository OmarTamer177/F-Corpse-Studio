import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE, apiClient } from '../services/api';

const Documents = () => {
  const { user, token, isStaff, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();

  // ── Document State ──
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myRequests, setMyRequests] = useState([]);

  // ── Filter & Search State ──
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
  const [selectedSort, setSelectedSort] = useState('newest');

  // ── Upload Form State ──
  const [uploadOpen, setUploadOpen] = useState(Boolean(searchParams.get('upload')));
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') || 'General');
  const [description, setDescription] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState(searchParams.get('request_id') || '');
  const [uploading, setUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState({ message: '', type: '' });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // ── Edit Modal State ──
  const [editingDoc, setEditingDoc] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editRequestId, setEditRequestId] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Supported Extensions Whitelist
  const supportedExtensions = [
    'pdf', 'doc', 'docx', 'txt', 'rtf', 'md', 'csv', 'xlsx',
    'png', 'jpg', 'jpeg', 'webp', 'svg', 'gif',
    'mp3', 'wav', 'ogg', 'flac',
    'zip', 'tar', 'gz', 'blend', 'fbx', 'obj'
  ];

  const categories = [
    'All',
    'General',
    'Project Brief',
    'Audio Asset',
    'Concept Art',
    'Documentation',
    'Contract',
    'Deliverable'
  ];

  useEffect(() => {
    if (token) {
      loadDocuments();
      loadUserRequests();
    }
  }, [token]);

  const loadDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/documents');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to retrieve documents.');
      }
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      setError(err.message || 'Error loading documents.');
    } finally {
      setLoading(false);
    }
  };

  const loadUserRequests = async () => {
    try {
      const res = await apiClient.get('/requests/my');
      if (res.ok) {
        const data = await res.json();
        setMyRequests(data);
      }
    } catch (err) {
      console.warn('Could not load user requests for linking:', err);
    }
  };

  // ── Drag & Drop Handlers ──
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file) => {
    setUploadFeedback({ message: '', type: '' });
    const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
    if (!supportedExtensions.includes(ext)) {
      setUploadFeedback({
        message: `File format '.${ext}' is not supported. Please choose an audio, document, visual, or archive file.`,
        type: 'error'
      });
      setSelectedFile(null);
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUploadFeedback({
        message: 'File size exceeds maximum permitted limit (25 MB).',
        type: 'error'
      });
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    if (!title) {
      // Auto-suggest title from filename without extension
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setTitle(baseName.replace(/[-_]/g, ' '));
    }
  };

  // ── Handle Upload Submission ──
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadFeedback({ message: 'Please select a file to upload.', type: 'error' });
      return;
    }

    setUploading(true);
    setUploadFeedback({ message: 'Uploading document to studio storage…', type: 'info' });

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (title.trim()) formData.append('title', title.trim());
    if (category) formData.append('category', category);
    if (description.trim()) formData.append('description', description.trim());
    if (selectedRequestId) formData.append('request_id', selectedRequestId);

    try {
      const res = await apiClient.upload('/documents/upload', formData);
      const data = await res.json();

      if (res.ok) {
        setUploadFeedback({
          message: `Document '${data.filename}' successfully uploaded and indexed.`,
          type: 'success'
        });
        // Reset inputs
        setSelectedFile(null);
        setTitle('');
        setDescription('');
        setSelectedRequestId('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        // Reload listing
        loadDocuments();
      } else {
        setUploadFeedback({
          message: data.error || data.message || 'Failed to upload document.',
          type: 'error'
        });
      }
    } catch (err) {
      setUploadFeedback({
        message: 'Network error or file too large. Please verify your connection.',
        type: 'error'
      });
    } finally {
      setUploading(false);
    }
  };

  // ── Handle Download ──
  const handleDownload = async (doc, inline = false) => {
    try {
      const url = `${API_BASE}/documents/${doc.id}/download${inline ? '?inline=1' : ''}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve file from storage.');
      }

      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);

      if (inline) {
        window.open(objectUrl, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = doc.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60000);
    } catch (err) {
      alert(`Could not download file: ${err.message}`);
    }
  };

  // ── Handle Edit ──
  const openEditModal = (doc) => {
    setEditingDoc(doc);
    setEditTitle(doc.title || doc.filename);
    setEditCategory(doc.category || 'General');
    setEditDescription(doc.description || '');
    setEditRequestId(doc.request_id ? String(doc.request_id) : '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingDoc) return;
    setSavingEdit(true);

    try {
      const res = await apiClient.put(`/documents/${editingDoc.id}`, {
        title: editTitle.trim(),
        category: editCategory,
        description: editDescription.trim(),
        request_id: editRequestId ? Number(editRequestId) : null
      });

      if (res.ok) {
        setEditingDoc(null);
        loadDocuments();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update document metadata.');
      }
    } catch (err) {
      alert('Network error while updating document.');
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Handle Delete ──
  const handleDelete = async (doc) => {
    const confirmMsg = `Are you sure you want to permanently delete '${doc.filename}'? This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await apiClient.delete(`/documents/${doc.id}`);
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== doc.id));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete document.');
      }
    } catch (err) {
      alert('Network error while deleting document.');
    }
  };

  // ── Filtering & Sorting ──
  const filteredDocs = documents.filter(doc => {
    if (selectedCategory !== 'All' && doc.category.toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = (doc.title || '').toLowerCase().includes(q);
      const matchName = (doc.filename || '').toLowerCase().includes(q);
      const matchDesc = (doc.description || '').toLowerCase().includes(q);
      const matchReq = (doc.request_title || '').toLowerCase().includes(q);
      if (!matchTitle && !matchName && !matchDesc && !matchReq) {
        return false;
      }
    }
    return true;
  });

  const sortedDocs = [...filteredDocs].sort((a, b) => {
    if (selectedSort === 'oldest') {
      return new Date(a.created_at) - new Date(b.created_at);
    }
    if (selectedSort === 'name') {
      return (a.title || a.filename).localeCompare(b.title || b.filename);
    }
    if (selectedSort === 'size') {
      return b.file_size - a.file_size;
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // Calculate Metrics
  const totalStorageBytes = documents.reduce((acc, doc) => acc + (doc.file_size || 0), 0);
  const formatTotalSize = (bytes) => {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${mb.toFixed(1)} MB`;
  };

  const getFileGlyph = (ext = '') => {
    const e = ext.toLowerCase();
    if (['pdf'].includes(e)) return '📄';
    if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(e)) return '🖼️';
    if (['mp3', 'wav', 'ogg', 'flac'].includes(e)) return '🎵';
    if (['zip', 'tar', 'gz'].includes(e)) return '📦';
    if (['blend', 'fbx', 'obj'].includes(e)) return '🧊';
    return '📝';
  };

  const isViewableInBrowser = (ext = '') => {
    return ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'txt', 'md'].includes(ext.toLowerCase());
  };

  // Monograph Studio Style Tokens
  const panelStyle = { background: 'var(--paper-white)', border: '1px solid var(--line-ink)', padding: '28px' };
  const headingStyle = { fontSize: '1.4rem', letterSpacing: '0.08em', marginBottom: '16px', fontFamily: 'var(--font-display)' };
  const labelStyle = { display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.88rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' };
  const fieldStyle = { width: '100%', border: '1px solid var(--line-muted)', background: 'var(--paper-surface)', color: 'var(--ink-solid)', font: 'inherit', padding: '10px 14px', outline: 'none' };

  return (
    <>
      {/* ── Hero Section ── */}
      <section className="hero-section" style={{ padding: '60px 0 35px' }}>
        <div className="container">
          <span className="hero-super-line">STUDIO ARCHIVES & REPOSITORY</span>
          <h1 className="hero-title" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)' }}>
            PROJECT DOCUMENTS & MEDIA
          </h1>
          <p style={{ color: 'var(--ink-secondary)', maxWidth: '640px', marginTop: '10px', fontSize: '0.98rem', lineHeight: 1.6 }}>
            Upload, inspect, and organize project briefs, reference audio tracks, concept art, and contracts linked to your creative production pipeline.
          </p>
        </div>
      </section>

      {/* ── Main Content Section ── */}
      <section style={{ paddingBottom: '70px' }}>
        <div className="container">

          {/* Quick Metrics Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '30px'
          }}>
            <div style={{ background: 'var(--paper-white)', border: '1px solid var(--line-ink)', padding: '18px 22px' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-display)', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Total Indexed Files
              </span>
              <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ink-solid)' }}>
                {documents.length}
              </div>
            </div>

            <div style={{ background: 'var(--paper-white)', border: '1px solid var(--line-ink)', padding: '18px 22px' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-display)', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Total Storage Consumed
              </span>
              <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--green-botanical)' }}>
                {formatTotalSize(totalStorageBytes)}
              </div>
            </div>

            <div style={{ background: 'var(--paper-white)', border: '1px solid var(--line-ink)', padding: '18px 22px' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-display)', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Single File Limit
              </span>
              <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ink-solid)' }}>
                25 MB
              </div>
            </div>

            <div style={{ background: 'var(--paper-white)', border: '1px solid var(--line-ink)', padding: '18px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <button
                onClick={() => setUploadOpen(prev => !prev)}
                className="btn-monograph"
                style={{ width: '100%', padding: '12px', fontSize: '0.9rem', textAlign: 'center' }}
              >
                {uploadOpen ? 'Hide Upload Panel ▲' : '+ Upload New Document'}
              </button>
            </div>
          </div>

          {/* ── Upload Panel / Dropzone ── */}
          {uploadOpen && (
            <div style={{ ...panelStyle, marginBottom: '36px', borderLeft: '4px solid var(--green-botanical)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ ...headingStyle, margin: 0 }}>UPLOAD PROJECT ASSET / DOCUMENT</h2>
                <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono, monospace)', color: 'var(--ink-muted)' }}>
                  MAX 25MB · MULTIPART STREAM
                </span>
              </div>

              <form onSubmit={handleUploadSubmit}>
                {/* Drag and Drop Box */}
                <div
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  style={{
                    border: dragOver ? '2px dashed var(--green-botanical)' : '2px dashed var(--line-ink)',
                    background: dragOver ? 'var(--green-wash)' : 'var(--paper-surface)',
                    padding: '30px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: '20px'
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>
                    {selectedFile ? getFileGlyph(selectedFile.name.split('.').pop()) : '📥'}
                  </div>
                  {selectedFile ? (
                    <div>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--green-botanical)' }}>
                        {selectedFile.name}
                      </strong>
                      <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                        Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Click or drag another file to replace
                      </span>
                    </div>
                  ) : (
                    <div>
                      <strong style={{ fontSize: '1rem', letterSpacing: '0.04em' }}>
                        Drag & Drop project file here, or click to browse
                      </strong>
                      <span style={{ display: 'block', fontSize: '0.82rem', color: 'var(--ink-muted)', marginTop: '6px' }}>
                        Supported formats: PDF, DOCX, TXT, MD, PNG, JPG, MP3, WAV, ZIP, BLEND, FBX, OBJ (up to 25MB)
                      </span>
                    </div>
                  )}
                </div>

                {/* Form Fields Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '18px' }}>
                  <div>
                    <label style={labelStyle}>Document Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Master Design Brief v2"
                      maxLength="200"
                      style={fieldStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Asset Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      style={fieldStyle}
                    >
                      {categories.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Link to Service Request (Optional)</label>
                    <select
                      value={selectedRequestId}
                      onChange={(e) => setSelectedRequestId(e.target.value)}
                      style={fieldStyle}
                    >
                      <option value="">— Standalone / Unlinked —</option>
                      {myRequests.map(r => (
                        <option key={r.id} value={r.id}>
                          #SR-{r.id} · {r.service_title} ({r.status})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Description / Notes</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows="2"
                    placeholder="Provide any instructions or reference details for the studio team…"
                    style={{ ...fieldStyle, resize: 'vertical' }}
                  />
                </div>

                {/* Submit Row */}
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    className="btn-monograph"
                    disabled={uploading || !selectedFile}
                  >
                    {uploading ? 'Uploading Asset…' : 'Start Secure Upload'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setTitle('');
                      setDescription('');
                      setUploadFeedback({ message: '', type: '' });
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="btn-monograph"
                    style={{ background: 'transparent', color: 'var(--ink-solid)' }}
                  >
                    Clear Form
                  </button>

                  {uploadFeedback.message && (
                    <span style={{
                      fontSize: '0.88rem',
                      fontWeight: 500,
                      color: uploadFeedback.type === 'error' ? '#9c2f25' : 'var(--green-botanical)'
                    }}>
                      {uploadFeedback.message}
                    </span>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* ── Search & Filter Controls ── */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '18px'
          }}>
            {/* Search Input */}
            <div style={{ flex: 1, minWidth: '260px', maxWidth: '440px' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents by name, title, or notes…"
                style={{ ...fieldStyle, padding: '10px 14px' }}
              />
            </div>

            {/* Sort Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Sort:
              </span>
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                style={{ ...fieldStyle, width: 'auto', padding: '8px 12px', fontSize: '0.88rem' }}
              >
                <option value="newest">Newest Uploads</option>
                <option value="oldest">Oldest First</option>
                <option value="name">File Title (A–Z)</option>
                <option value="size">File Size (Largest)</option>
              </select>

              <button
                onClick={loadDocuments}
                className="btn-monograph"
                style={{ background: 'transparent', color: 'var(--ink-solid)', padding: '8px 14px', fontSize: '0.85rem' }}
                title="Reload documents"
              >
                ↻
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
            {categories.map(cat => {
              const count = cat === 'All'
                ? documents.length
                : documents.filter(d => (d.category || '').toLowerCase() === cat.toLowerCase()).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.82rem',
                    border: '1px solid var(--line-ink)',
                    background: selectedCategory.toLowerCase() === cat.toLowerCase() ? 'var(--ink-solid)' : 'var(--paper-white)',
                    color: selectedCategory.toLowerCase() === cat.toLowerCase() ? 'var(--paper-white)' : 'var(--ink-solid)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '0.06em',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* ── Document List ── */}
          {loading && <p className="empty-note">Indexing documents from storage…</p>}
          {error && <p className="empty-note" style={{ color: '#9c2f25' }}>{error}</p>}

          {!loading && !error && documents.length === 0 && (
            <div style={{
              background: 'var(--paper-white)',
              border: '1px solid var(--line-ink)',
              padding: '60px 30px',
              textAlign: 'center'
            }}>
              <span className="hero-super-line" style={{ display: 'block', marginBottom: '8px' }}>NO ASSETS ARCHIVED</span>
              <h3 style={{ fontSize: '1.4rem', letterSpacing: '0.06em', marginBottom: '10px' }}>
                YOU HAVE NOT UPLOADED ANY DOCUMENTS YET
              </h3>
              <p style={{ color: 'var(--ink-secondary)', maxWidth: '520px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                Attach game design briefs, concept art, reference tracks, or contracts to streamline your quote requests and studio collaboration.
              </p>
              <button
                onClick={() => setUploadOpen(true)}
                className="btn-monograph"
              >
                + Upload Your First Document
              </button>
            </div>
          )}

          {!loading && !error && documents.length > 0 && sortedDocs.length === 0 && (
            <p className="empty-note">No documents found matching the current filters.</p>
          )}

          {!loading && !error && sortedDocs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {sortedDocs.map(doc => {
                const glyph = getFileGlyph(doc.file_extension);
                const canPreview = isViewableInBrowser(doc.file_extension);

                return (
                  <div
                    key={doc.id}
                    style={{
                      background: 'var(--paper-white)',
                      border: '1px solid var(--line-ink)',
                      padding: '20px 24px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                    }}
                  >
                    {/* Left details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '280px' }}>
                      <div style={{
                        fontSize: '2rem',
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--paper-surface)',
                        border: '1px solid var(--line-muted)'
                      }}>
                        {glyph}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <h3 style={{ fontSize: '1.15rem', letterSpacing: '0.04em', margin: 0 }}>
                            {doc.title || doc.filename}
                          </h3>
                          <span style={{
                            fontSize: '0.72rem',
                            fontFamily: 'var(--font-display)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            background: 'var(--paper-surface)',
                            border: '1px solid var(--line-muted)',
                            padding: '2px 8px',
                            color: 'var(--ink-secondary)'
                          }}>
                            {doc.category || 'General'}
                          </span>
                          {doc.request_id && (
                            <Link
                              to="/dashboard"
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--green-botanical)',
                                fontFamily: 'var(--font-mono, monospace)',
                                textDecoration: 'underline'
                              }}
                              title={doc.request_title || `Service Request #${doc.request_id}`}
                            >
                              Linked: #SR-{doc.request_id}
                            </Link>
                          )}
                        </div>

                        <div style={{ fontSize: '0.84rem', color: 'var(--ink-muted)', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                          <span>File: <code>{doc.filename}</code></span>
                          <span>Size: <strong>{doc.file_size_formatted}</strong></span>
                          <span>Uploaded: {new Date(doc.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          {isStaff && doc.uploader_name && (
                            <span>By: <em>{doc.uploader_name}</em></span>
                          )}
                        </div>

                        {doc.description && (
                          <p style={{ margin: '6px 0 0', fontSize: '0.88rem', color: 'var(--ink-secondary)', fontStyle: 'italic' }}>
                            "{doc.description}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right actions */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {canPreview && (
                        <button
                          onClick={() => handleDownload(doc, true)}
                          className="btn-monograph"
                          style={{
                            background: 'transparent',
                            color: 'var(--ink-solid)',
                            padding: '8px 14px',
                            fontSize: '0.82rem'
                          }}
                        >
                          👁 View
                        </button>
                      )}

                      <button
                        onClick={() => handleDownload(doc, false)}
                        className="btn-monograph"
                        style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                      >
                        ↓ Download
                      </button>

                      <button
                        onClick={() => openEditModal(doc)}
                        className="btn-monograph"
                        style={{
                          background: 'transparent',
                          color: 'var(--ink-secondary)',
                          padding: '8px 12px',
                          fontSize: '0.82rem'
                        }}
                        title="Edit title & notes"
                      >
                        ✎ Edit
                      </button>

                      <button
                        onClick={() => handleDelete(doc)}
                        className="btn-monograph"
                        style={{
                          background: 'transparent',
                          color: '#9c2f25',
                          borderColor: '#9c2f25',
                          padding: '8px 12px',
                          fontSize: '0.82rem'
                        }}
                        title="Delete file"
                      >
                        ✕ Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Section Divider ── */}
          <hr className="admin-section-divider" style={{ margin: '50px 0 30px' }} />

          {/* Informational Footer Note */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
              All documents stored in this archive are encrypted at rest and accessible only by you and the assigned studio production team.
            </span>
            <Link to="/dashboard" style={{ fontSize: '0.88rem', color: 'var(--green-botanical)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>
              ← Return to Client Portal
            </Link>
          </div>

        </div>
      </section>

      {/* ── Edit Metadata Modal ── */}
      {editingDoc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(20, 23, 21, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--paper-white)',
            border: '1px solid var(--line-ink)',
            maxWidth: '520px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ ...headingStyle, marginBottom: '6px' }}>EDIT DOCUMENT SPECIFICATIONS</h3>
            <span style={{ display: 'block', fontSize: '0.84rem', color: 'var(--ink-muted)', marginBottom: '18px' }}>
              Original File: <code>{editingDoc.filename}</code> ({editingDoc.file_size_formatted})
            </span>

            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Document Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  maxLength="200"
                  style={fieldStyle}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  style={fieldStyle}
                >
                  {categories.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Link to Service Request</label>
                <select
                  value={editRequestId}
                  onChange={(e) => setEditRequestId(e.target.value)}
                  style={fieldStyle}
                >
                  <option value="">— Unlinked / Standalone —</option>
                  {myRequests.map(r => (
                    <option key={r.id} value={r.id}>
                      #SR-{r.id} · {r.service_title} ({r.status})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Description / Notes</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows="3"
                  style={{ ...fieldStyle, resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="btn-monograph"
                  style={{ background: 'transparent', color: 'var(--ink-solid)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-monograph"
                  disabled={savingEdit}
                >
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Documents;
