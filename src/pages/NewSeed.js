import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import deleteIcon from '../icons/delete.svg';
import seedSmallIcon from '../icons/seed-small.svg';
import dropdownIcon from '../icons/dropdown.svg';
import {
  CATEGORIES_CHANGED_EVENT,
  CUSTOM_CATEGORIES_KEY,
  getCategoryColors,
} from '../data/categoryColors';
import './NewSeed.css';

export default function NewSeed() {
  const navigate = useNavigate();

  const [categoryColors, setCategoryColors] = useState(getCategoryColors);
  const [title, setTitle] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [context, setContext] = useState('');
  const [blocker, setBlocker] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [mediaLinks, setMediaLinks] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [viewerSrc, setViewerSrc] = useState(null);

  useEffect(() => {
    if (!viewerSrc) return;
    function onKey(e) { if (e.key === 'Escape') setViewerSrc(null); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [viewerSrc]);

  const dropdownRef = useRef(null);

  useEffect(() => {
    function refreshCategories() {
      setCategoryColors(getCategoryColors());
    }

    function onStorage(e) {
      if (e.key === CUSTOM_CATEGORIES_KEY) refreshCategories();
    }

    window.addEventListener('focus', refreshCategories);
    window.addEventListener('storage', onStorage);
    window.addEventListener(CATEGORIES_CHANGED_EVENT, refreshCategories);
    return () => {
      window.removeEventListener('focus', refreshCategories);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CATEGORIES_CHANGED_EVENT, refreshCategories);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function onClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [dropdownOpen]);

  function extractDomain(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
  }

  function extractTitle(url) {
    try {
      const { pathname } = new URL(url);
      const segment = pathname.split('/').filter(Boolean).pop() || '';
      if (!segment) return extractDomain(url);
      return segment.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    } catch { return url; }
  }

  function handleLinkKeyDown(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const raw = linkInput.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
    setMediaLinks((prev) => [...prev, url]);
    setLinkInput('');
  }

  function removeLink(i) {
    setMediaLinks((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      /\.(jpe?g|png)$/i.test(f.name),
    );
    if (!files.length) return;
    setMediaLinks((prev) => [
      ...prev,
      ...files.map((f) => ({ type: 'image', path: f.path || '', name: f.name, previewUrl: URL.createObjectURL(f) })),
    ]);
  }

  function toggleCategory(cat) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const id = `u_${Date.now()}`;
    const newSeed = {
      id,
      title: title.trim(),
      context: context.trim(),
      tags: selectedCategories,
      blocker: blocker.trim(),
      media: mediaLinks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (window.fallow?.createSeed) {
      await window.fallow.createSeed(newSeed);
    } else {
      const today = new Date();
      const added = [
        String(today.getDate()).padStart(2, '0'),
        String(today.getMonth() + 1).padStart(2, '0'),
        today.getFullYear(),
      ].join('/');
      const saved = JSON.parse(localStorage.getItem('fallow:userSeeds') || '[]');
      saved.unshift({ ...newSeed, branches: 0, added });
      localStorage.setItem('fallow:userSeeds', JSON.stringify(saved));
    }
    localStorage.removeItem('fallow:roots');
    navigate('/garden');
  }

  const triggerHasSelection = selectedCategories.length > 0;

  return (
    <>
    {viewerSrc && (
      <div className="media-viewer-overlay" onClick={() => setViewerSrc(null)}>
        <img src={viewerSrc} alt="" className="media-viewer-img" onClick={(e) => e.stopPropagation()} />
        <button type="button" className="media-viewer-close" onClick={() => setViewerSrc(null)}>×</button>
      </div>
    )}
    <div className="page newseed-page">
      <div className="newseed-wrapper">
        <div className="newseed-card">
          <h1 className="newseed-title">Plant a new seed</h1>

          <form onSubmit={handleSubmit} className="newseed-form">
            {/* Row 1: Title + Category */}
            <div className="newseed-row">
              <div className="newseed-field newseed-field--wide">
                <label className="newseed-label">Title:</label>
                <input
                  className="newseed-input"
                  placeholder="Add a title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div
                className="newseed-field newseed-field--narrow"
                ref={dropdownRef}
              >
                <label className="newseed-label">Category:</label>
                <button
                  type="button"
                  className={`newseed-cat-trigger${
                    triggerHasSelection ? ' is-selected' : ''
                  }`}
                  onClick={() => setDropdownOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={dropdownOpen}
                >
                  <span className="newseed-cat-trigger__text">
                    {triggerHasSelection
                      ? selectedCategories.join(', ')
                      : 'Add a category'}
                  </span>
                  <img
                    src={dropdownIcon}
                    alt=""
                    className={`newseed-cat-trigger__icon${
                      dropdownOpen ? ' is-open' : ''
                    }`}
                    width="12"
                    height="12"
                  />
                </button>

                <div
                  className={`newseed-cat-dropdown${dropdownOpen ? ' is-open' : ''}`}
                  role="listbox"
                  aria-hidden={!dropdownOpen}
                >
                    <div className="newseed-cat-grid">
                      {Object.keys(categoryColors).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          role="option"
                          aria-selected={selectedCategories.includes(cat)}
                          tabIndex={dropdownOpen ? 0 : -1}
                          className={`newseed-cat-pill${
                            selectedCategories.includes(cat)
                              ? ' is-selected'
                              : ''
                          }`}
                          style={{ '--cat-color': categoryColors[cat] }}
                          onClick={() => toggleCategory(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="newseed-cat-create"
                      tabIndex={dropdownOpen ? 0 : -1}
                      onClick={() => navigate('/categories/new')}
                    >
                      <span className="newseed-cat-create__plus">+</span>
                      Create New Category
                    </button>
                  </div>
              </div>
            </div>

            {/* Context */}
            <div className="newseed-field">
              <label className="newseed-label">Context:</label>
              <textarea
                className="newseed-textarea"
                placeholder="Describe your idea..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
              />
            </div>

            {/* Blocker */}
            <div className="newseed-field">
              <label className="newseed-label">
                What&apos;s blocking you right now?
              </label>
              <p className="newseed-subtext">
                When a relevant change in circumstance is added, Fallow will
                resurface this idea for you
              </p>
              <textarea
                className="newseed-textarea"
                placeholder="Describe what's stopping you..."
                value={blocker}
                onChange={(e) => setBlocker(e.target.value)}
              />
            </div>

            {/* Media and Links */}
            <div
              className="newseed-field"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <label className="newseed-label">Media and Links:</label>
              <input
                className={`newseed-input newseed-input--drop${isDragOver ? ' is-drag-over' : ''}`}
                placeholder="Paste a link and press Enter — or drop an image"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={handleLinkKeyDown}
              />
              {mediaLinks.length > 0 && (
                <div className="newseed-media-list">
                  {mediaLinks.map((item, i) => {
                    if (typeof item === 'string') {
                      return (
                        <a key={i} href={item} target="_blank" rel="noreferrer" className="newseed-media-card">
                          <div className="newseed-media-card__body">
                            <div className="newseed-media-card__top">
                              <span className="newseed-media-card__title">{extractTitle(item)}</span>
                              <span className="newseed-media-card__publisher">{extractDomain(item)}</span>
                            </div>
                            <span className="newseed-media-card__url">{item}</span>
                          </div>
                          <button type="button" className="newseed-media-card__remove" onClick={(e) => { e.preventDefault(); removeLink(i); }} aria-label="Remove">×</button>
                        </a>
                      );
                    }
                    return (
                      <div key={i} className="newseed-media-image">
                        <div className="newseed-media-image__frame" onClick={() => setViewerSrc(item.previewUrl)}>
                          <img src={item.previewUrl} alt={item.name} />
                          <button type="button" className="newseed-media-image__remove" onClick={(e) => { e.stopPropagation(); removeLink(i); }} aria-label="Remove">×</button>
                        </div>
                        <span className="newseed-media-image__name">{item.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom actions */}
            <div className="newseed-actions">
              <button
                type="button"
                className="newseed-btn newseed-btn--discard"
                onClick={() => navigate('/garden')}
              >
                <img
                  src={deleteIcon}
                  alt=""
                  width="16"
                  height="16"
                  style={{ display: 'block' }}
                />
                Discard Entry
              </button>
              <button type="submit" className="newseed-btn newseed-btn--plant">
                <img
                  src={seedSmallIcon}
                  alt=""
                  width="16"
                  height="16"
                  style={{ display: 'block' }}
                />
                Plant Seed
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </>
  );
}
