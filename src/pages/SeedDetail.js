import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import returnIcon from '../icons/return.svg';
import moreIcon from '../icons/more.svg';
import revertIcon from '../icons/revert.svg';
import editIcon from '../icons/edit.svg';
import deleteIcon from '../icons/delete.svg';
import yesIcon from '../icons/yes.svg';
import dropdownIcon from '../icons/dropdown.svg';
import plantSmall from '../plants/plant-small.gif';
import plantMedium from '../plants/plant-medium.gif';
import plantLarge from '../plants/plant-large.gif';
import {
  categoryColor,
  CATEGORIES_CHANGED_EVENT,
  CUSTOM_CATEGORIES_KEY,
  getCategoryColors,
} from '../data/categoryColors';
import { getBranches, getRoots } from '../services/hermes';
import { useStore } from '../hooks/useStore';
import { extractRootsForSeed } from '../utils/hermesRoots';
import {
  buildPairSpecificRootDescription,
  countRootDescriptions,
  needsPairSpecificRootDescription,
} from '../utils/rootDescriptions';
import { filterVisibleSeeds, hideSeed, isSeedHidden, readUserSeeds } from '../utils/seedStorage';
import { notifyBranchLogChanged } from '../utils/branchLogNotifications';
import './SeedDetail.css';

const UPDATED_CONDITIONS_KEY = 'fallow:updatedConditions';
const REVERTED_CONDITIONS_KEY = 'fallow:revertedConditions';

const DEMO_SEED = {
  id: 'a2',
  title: 'Custom NAS Home Server',
  dateAdded: '18/03/2026',
  category: { name: 'Technology', color: categoryColor('Technology') },
  plant: plantMedium,
  branches: 5,
  roots: 2,
  context:
    'Self-hosted NAS using recycled computer hard drives in a low-power system with custom 3D-printed enclosures. The goal is to build a personal cloud storage solution that is energy efficient, expandable, and designed to fit into a small form factor similar to a coffee maker or small appliance. I want to avoid proprietary NAS systems and instead build something open-source that I can customize over time.',
  blocker:
    "Currently I lack quick access to a 3D modelling tool, which means I can't effectively design a tangible form for either 3D printing or digitally rendering the enclosure parts.",
  media: [1, 2, 3],
  branchesList: [1, 2, 3, 4, 5],
  rootsList: [
    {
      id: 'r1',
      title: 'Wall-Mounted Record Player',
      color: categoryColor('Technology'),
      description:
        'Both seeds share the same category of technology, and involve extensive 3D designing.',
    },
    {
      id: 'r2',
      title: 'Non-Humanoid Robotics',
      color: categoryColor('UX Design'),
      description:
        'Both seeds place emphasis on the user interaction and experience through hardware and software.',
    },
  ],
};

function plantFor(branches) {
  if (branches >= 6) return plantLarge;
  if (branches >= 3) return plantMedium;
  return plantSmall;
}

function normalizeSeed(raw) {
  const tags = raw.tags || [];
  return {
    id: raw.id,
    title: raw.title || '',
    dateAdded: raw.dateAdded || raw.added || '',
    categories: raw.categories || (raw.category
      ? [raw.category]
      : tags.map((t) => ({ name: t, color: categoryColor(t) }))),
    plant: raw.plant || plantFor(raw.branches || 0),
    branches: raw.branches || 0,
    roots: raw.roots || 0,
    context: raw.context || raw.desc || '',
    blocker: raw.blocker || '',
    media: raw.media || [],
    branchesList: raw.branchesList || [],
    rootsList: raw.rootsList || [],
  };
}

function readJsonMap(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function findSeed(seeds, match) {
  return seeds.find((seed) =>
    String(seed.id) === String(match?.id) || seed.title === match?.title
  );
}

export default function SeedDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { seeds } = useStore();
  const [categoryColors, setCategoryColors] = useState(getCategoryColors);

  const [seed, setSeed] = useState(() => {
    if (id && !isSeedHidden(id)) {
      const foundSaved = readUserSeeds().find((s) => String(s.id) === String(id));
      if (foundSaved) return normalizeSeed(foundSaved);
      if (seeds.length) {
        const foundStore = seeds.find((s) => String(s.id) === String(id));
        if (foundStore) return normalizeSeed(foundStore);
      }
    }
    // fallback
    return normalizeSeed(DEMO_SEED);
  });

  useEffect(() => {
    if (id) {
      if (isSeedHidden(id)) {
        navigate('/garden', { replace: true });
        return;
      }
      const foundSaved = readUserSeeds().find((s) => String(s.id) === String(id));
      if (foundSaved) {
        setSeed(normalizeSeed(foundSaved));
        return;
      }
      const foundStore = seeds.find((s) => String(s.id) === String(id));
      if (foundStore) setSeed(normalizeSeed(foundStore));
    }
  }, [id, navigate, seeds]);

  const [rootsList, setRootsList] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('fallow:roots') || 'null');
      const extracted = extractRootsForSeed(cached, seed.id);
      if (extracted?.length) return extracted;
    } catch {}
    return [];
  });
  const displayedRootsList = useMemo(() => {
    const allSeeds = filterVisibleSeeds([seed, ...readUserSeeds(), ...seeds]);
    const descriptionCounts = countRootDescriptions([{ seeds: rootsList }]);

    return rootsList.map((root) => {
      const connectedSeed = findSeed(allSeeds, root) || root;
      const descriptionKey = (root.description || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const duplicateCount = descriptionCounts.get(descriptionKey) || 0;
      const description = needsPairSpecificRootDescription(
        root.description,
        seed,
        connectedSeed,
        duplicateCount,
      )
        ? buildPairSpecificRootDescription(seed, connectedSeed)
        : root.description;

      return { ...root, description };
    });
  }, [rootsList, seed, seeds]);

  const [updatedCondition, setUpdatedCondition] = useState(() => {
    if (localStorage.getItem('fallow:conditionsResetV3')) {
      const all = readJsonMap(UPDATED_CONDITIONS_KEY);
      return all[seed.id] || null;
    }
    return null;
  });
  const [isReverted, setIsReverted] = useState(() => {
    const reverted = readJsonMap(REVERTED_CONDITIONS_KEY);
    return !!reverted[seed.id];
  });

  useEffect(() => {
    if (!seed.id || !localStorage.getItem('fallow:conditionsResetV3')) {
      setUpdatedCondition(null);
      setIsReverted(false);
      return;
    }

    const updatedMap = readJsonMap(UPDATED_CONDITIONS_KEY);
    const revertedMap = readJsonMap(REVERTED_CONDITIONS_KEY);
    setUpdatedCondition(updatedMap[seed.id] || null);
    setIsReverted(Boolean(revertedMap[seed.id]));
  }, [seed.id]);

  useEffect(() => {
    if (localStorage.getItem('fallow:conditionsResetV3')) return;
    localStorage.removeItem(UPDATED_CONDITIONS_KEY);
    localStorage.removeItem('fallow:resurfacedSeeds');
    localStorage.removeItem('fallow:conditions');
    localStorage.removeItem(REVERTED_CONDITIONS_KEY);
    localStorage.setItem('fallow:conditionsResetV3', '1');
    setUpdatedCondition(null);
    setIsReverted(false);
  }, []);

  const [viewerSrc, setViewerSrc] = useState(null);

  // More-button popover
  const [moreOpen, setMoreOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, right: 0 });
  const moreBtnRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!moreOpen) return;
    function onDown(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target) &&
          moreBtnRef.current && !moreBtnRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [moreOpen]);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCategories, setEditCategories] = useState([]);
  const [editContext, setEditContext] = useState('');
  const [editBlocker, setEditBlocker] = useState('');
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const catDropdownRef = useRef(null);

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

  useEffect(() => {
    if (!catDropdownOpen) return;
    function onDown(e) {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target)) {
        setCatDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [catDropdownOpen]);

  function handleMoreClick() {
    if (!moreOpen && moreBtnRef.current) {
      const rect = moreBtnRef.current.getBoundingClientRect();
      setPopoverPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setMoreOpen((v) => !v);
  }

  function handleOpenEdit() {
    setEditTitle(seed.title);
    setEditCategories(seed.categories.map((c) => c.name));
    setEditContext(seed.context);
    setEditBlocker(seed.blocker);
    setIsEditing(true);
    setMoreOpen(false);
  }

  function handleSoftDelete() {
    if (!seed.id) return;
    hideSeed(seed.id);
    setMoreOpen(false);
    navigate('/garden', { replace: true });
  }

  function handleDiscardEdits() {
    setIsEditing(false);
    setCatDropdownOpen(false);
  }

  function handleApplyEdits() {
    const updatedCategories = editCategories.map((name) => ({ name, color: categoryColor(name) }));
    const updated = { ...seed, title: editTitle, categories: updatedCategories, context: editContext, blocker: editBlocker };
    setSeed(updated);
    if (seed.id && seed.id.startsWith('u_')) {
      const all = JSON.parse(localStorage.getItem('fallow:userSeeds') || '[]');
      const idx = all.findIndex((s) => s.id === seed.id);
      if (idx !== -1) {
        all[idx] = { ...all[idx], title: editTitle, tags: editCategories, context: editContext, blocker: editBlocker, desc: editContext.slice(0, 150) };
        localStorage.setItem('fallow:userSeeds', JSON.stringify(all));
      }
    }
    setIsEditing(false);
    setCatDropdownOpen(false);
  }

  function toggleEditCategory(cat) {
    setEditCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  }

  const [mediaLinks, setMediaLinks] = useState(() =>
    seed.media.filter((m) => typeof m === 'string' || m?.type === 'image'),
  );
  const [linkInput, setLinkInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (!viewerSrc) return;
    function onKey(e) { if (e.key === 'Escape') setViewerSrc(null); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [viewerSrc]);

  function persistMedia(updated) {
    if (!seed.id || !seed.id.startsWith('u_')) return;
    const all = JSON.parse(localStorage.getItem('fallow:userSeeds') || '[]');
    const idx = all.findIndex((s) => s.id === seed.id);
    if (idx === -1) return;
    all[idx].media = updated.map((m) =>
      m?.type === 'image' ? { type: 'image', path: m.path, name: m.name } : m,
    );
    localStorage.setItem('fallow:userSeeds', JSON.stringify(all));
  }

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
    setMediaLinks((prev) => { const next = [...prev, url]; persistMedia(next); return next; });
    setLinkInput('');
  }

  function removeMediaItem(i) {
    setMediaLinks((prev) => { const next = prev.filter((_, idx) => idx !== i); persistMedia(next); return next; });
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
    const files = Array.from(e.dataTransfer.files).filter((f) => /\.(jpe?g|png)$/i.test(f.name));
    if (!files.length) return;
    const items = files.map((f) => ({ type: 'image', path: f.path || '', name: f.name, previewUrl: URL.createObjectURL(f) }));
    setMediaLinks((prev) => { const next = [...prev, ...items]; persistMedia(next); return next; });
  }

  const [branches, setBranches] = useState(null);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState(null);
  const [rootsLoading, setRootsLoading] = useState(false);
  const [rootsError, setRootsError] = useState(null);
  const [rootsDone, setRootsDone] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [likedBranches, setLikedBranches] = useState(() => {
    const stored = JSON.parse(localStorage.getItem('fallow:likedBranches') || '{}');
    return Object.values(stored).find((e) => e.seedTitle === seed.title)?.branches || [];
  });

  const findRoots = useCallback(async () => {
    setRootsLoading(true);
    setRootsError(null);
    setRootsDone(false);
    try {
      const allSeeds = filterVisibleSeeds(JSON.parse(localStorage.getItem('fallow:userSeeds') || '[]'));
      const result = await getRoots(
        allSeeds.map((s) => ({
          id: s.id,
          title: s.title,
          tags: s.tags || [],
          context: s.context || s.desc || '',
        })),
        { focusSeed: { title: seed.title } }
      );
      localStorage.setItem('fallow:roots', JSON.stringify(result));
      const extracted = extractRootsForSeed(result, seed.id);
      setRootsList(extracted || []);
      setRootsDone(true);
    } catch (e) {
      setRootsError(e.message);
    } finally {
      setRootsLoading(false);
    }
  }, [seed.id, seed.title]);

  const searchBranches = useCallback(async () => {
    setBranchesLoading(true);
    setBranchesError(null);
    setSearchDone(false);
    try {
      const dislikes = JSON.parse(localStorage.getItem('fallow:dislikes') || '{}');
      const seedDislikes = dislikes[seed.title] || [];
      const result = await getBranches(
        { id: seed.id, title: seed.title, context: seed.context, tags: seed.categories.map((c) => c.name) },
        { specificRequest: searchQuery || undefined, dislikes: seedDislikes }
      );
      const fetched = result.results ?? result;
      setBranches(fetched);
      setSearchDone(true);
      const stored = JSON.parse(localStorage.getItem('fallow:branchLog') || '[]');
      const idx = stored.findIndex((e) => e.seedId === seed.id);
      const entry = {
        seedId: seed.id,
        seedTitle: seed.title,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        branches: fetched,
      };
      if (idx >= 0) stored[idx] = entry; else stored.unshift(entry);
      localStorage.setItem('fallow:branchLog', JSON.stringify(stored));
      notifyBranchLogChanged();
    } catch (e) {
      setBranchesError(e.message);
    } finally {
      setBranchesLoading(false);
    }
  }, [seed, searchQuery]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('fallow:likedBranches') || '{}');
    setLikedBranches(
      Object.values(stored).find((e) => e.seedTitle === seed.title)?.branches || []
    );
  }, [seed.title]);
  useEffect(() => {
    function onStorage(e) {
      if (e.key !== 'fallow:roots') return;
      try {
        const cached = JSON.parse(e.newValue || 'null');
        const extracted = extractRootsForSeed(cached, seed.id);
        if (extracted?.length) setRootsList(extracted);
      } catch {}
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [seed.id]);

  const [showGradient, setShowGradient] = useState(true);
  const cardRef = useRef(null);
  const returnRef = useRef(null);

  useEffect(() => {
    const card = cardRef.current;
    const footer = returnRef.current;
    if (!card || !footer) return;
    function check() {
      const footerTop = footer.getBoundingClientRect().top;
      const cardBottom = card.getBoundingClientRect().bottom;
      setShowGradient(footerTop >= cardBottom);
    }
    check();
    card.addEventListener('scroll', check);
    window.addEventListener('resize', check);
    return () => {
      card.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, []);

  const currentCondition = updatedCondition && !isReverted ? updatedCondition.text : seed.blocker;

  return (
    <>
    {viewerSrc && (
      <div className="media-viewer-overlay" onClick={() => setViewerSrc(null)}>
        <img src={viewerSrc} alt="" className="media-viewer-img" onClick={(e) => e.stopPropagation()} />
        <button type="button" className="media-viewer-close" onClick={() => setViewerSrc(null)}>×</button>
      </div>
    )}
    <div className="page seed-page">
      <div className="seed-card-wrapper">
        <div className="seed-card" ref={cardRef}>
          {/* Header */}
          <div className="seed-header">
            <div className="seed-header__left">
              {isEditing ? (
                <input
                  className="seed-edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              ) : (
                <h1 className="seed-title">{seed.title}</h1>
              )}
              <div className="seed-date">Date Added: {seed.dateAdded}</div>
              {isEditing ? (
                <div className="seed-edit-cat-wrapper" ref={catDropdownRef}>
                  <button
                    type="button"
                    className={`seed-edit-cat-trigger${editCategories.length > 0 ? ' is-selected' : ''}`}
                    onClick={() => setCatDropdownOpen((v) => !v)}
                  >
                    <span className="seed-edit-cat-trigger__text">
                      {editCategories.length > 0 ? editCategories.join(', ') : 'Add a category'}
                    </span>
                    <img src={dropdownIcon} alt="" className={`seed-edit-cat-trigger__icon${catDropdownOpen ? ' is-open' : ''}`} width="12" height="12" />
                  </button>
                  <div className={`seed-edit-cat-dropdown${catDropdownOpen ? ' is-open' : ''}`}>
                    <div className="seed-edit-cat-grid">
                      {Object.keys(categoryColors).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`seed-edit-cat-pill${editCategories.includes(cat) ? ' is-selected' : ''}`}
                          style={{ '--cat-color': categoryColors[cat] }}
                          onClick={() => toggleEditCategory(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="seed-meta">
                  {seed.categories.map((cat) => (
                    <span key={cat.name} className="seed-category" style={{ background: cat.color }}>
                      {cat.name}
                    </span>
                  ))}
                  <span className="seed-meta-divider">|</span>
                  <span>Branches: {likedBranches.length}</span>
                  <span className="seed-meta-divider">|</span>
                  <span>Roots: {rootsList.length}</span>
                </div>
              )}
            </div>
            <div className="seed-header__right">
              <div className="seed-plant-preview">
                <img src={seed.plant} alt="" />
              </div>
              <div style={{ position: 'relative' }}>
                <button
                  ref={moreBtnRef}
                  className="seed-more-btn"
                  aria-label="More options"
                  type="button"
                  onClick={handleMoreClick}
                >
                  <img src={moreIcon} alt="" width="16" height="16" />
                </button>
                <div
                  ref={popoverRef}
                  className={`seed-more-popover${moreOpen ? ' is-open' : ''}`}
                  style={{ position: 'fixed', top: popoverPos.top, right: popoverPos.right }}
                  aria-hidden={!moreOpen}
                  role="menu"
                >
                  <button
                    type="button"
                    className="seed-more-popover__option"
                    tabIndex={moreOpen ? 0 : -1}
                    onClick={handleOpenEdit}
                    role="menuitem"
                  >
                    <img src={editIcon} alt="" />
                    Edit Seed
                  </button>
                  <button
                    type="button"
                    className="seed-more-popover__option"
                    tabIndex={moreOpen ? 0 : -1}
                    onClick={handleSoftDelete}
                    role="menuitem"
                  >
                    <img src={deleteIcon} alt="" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="seed-divider" />

          {/* Content */}
          <div className="seed-body">
            {/* Context */}
            <section className="seed-section">
              <h2 className="seed-section__label">Context:</h2>
              {isEditing ? (
                <textarea className="seed-edit-textarea" value={editContext} onChange={(e) => setEditContext(e.target.value)} />
              ) : (
                <div className="seed-text-box">{seed.context}</div>
              )}
            </section>

            {/* Blocker / Updated Condition */}
            <section className="seed-section">
              {isEditing ? (
                <>
                  <h2 className="seed-section__label">What&apos;s blocking you right now?</h2>
                  <textarea className="seed-edit-textarea" value={editBlocker} onChange={(e) => setEditBlocker(e.target.value)} />
                </>
              ) : (
              <>
              <div className="seed-section__header">
                {updatedCondition ? (
                  <>
                    <div>
                      <h2 className="seed-section__label">
                        {isReverted ? 'Original Condition' : 'Updated Condition'}
                      </h2>
                      {!isReverted && (
                        <span className="seed-section__sub">
                          (Updated by Fallow on {updatedCondition?.date})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className={`seed-revert-btn${isReverted ? ' is-reverted' : ''}`}
                      onClick={() => {
                        const next = !isReverted;
                        setIsReverted(next);
                        const map = readJsonMap(REVERTED_CONDITIONS_KEY);
                        if (next) map[seed.id] = true;
                        else delete map[seed.id];
                        localStorage.setItem(REVERTED_CONDITIONS_KEY, JSON.stringify(map));
                      }}
                    >
                      <img src={revertIcon} alt="" width="14" height="14" />
                      {isReverted ? 'Apply Update' : 'Revert'}
                    </button>
                  </>
                ) : (
                  <h2 className="seed-section__label">
                    What&apos;s blocking you right now?
                  </h2>
                )}
              </div>
              <div className="seed-text-box">{currentCondition}</div>
              </>
              )}
            </section>

            {/* Media and Links */}
            <section className="seed-section">
              <h2 className="seed-section__label">Media and Links:</h2>
              {isEditing ? (
                <div
                  className="seed-media-drop-field"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    className={`seed-media-input${isDragOver ? ' is-drag-over' : ''}`}
                    placeholder="Paste a link and press Enter — or drop an image"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    onKeyDown={handleLinkKeyDown}
                  />
                  {mediaLinks.length > 0 && (
                    <div className="seed-media-list">
                      {mediaLinks.map((item, i) => {
                        if (typeof item === 'string') {
                          return (
                            <a key={i} href={item} target="_blank" rel="noreferrer" className="seed-branch-card seed-media-card">
                              <div className="seed-branch-card__top">
                                <span className="seed-branch-card__title">{extractTitle(item)}</span>
                                <span className="seed-branch-card__publisher">{extractDomain(item)}</span>
                              </div>
                              <span className="seed-branch-card__url">{item}</span>
                              <button type="button" className="seed-media-card__remove" onClick={(e) => { e.preventDefault(); removeMediaItem(i); }} aria-label="Remove">×</button>
                            </a>
                          );
                        }
                        const imgSrc = item.previewUrl || `file:///${(item.path || '').replace(/\\/g, '/')}`;
                        return (
                          <div key={i} className="seed-media-image">
                            <div className="seed-media-image__frame" onClick={() => setViewerSrc(imgSrc)}>
                              <img src={imgSrc} alt={item.name} />
                              <button type="button" className="seed-media-image__remove" onClick={(e) => { e.stopPropagation(); removeMediaItem(i); }} aria-label="Remove">×</button>
                            </div>
                            <span className="seed-media-image__name">{item.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : mediaLinks.length > 0 ? (
                <div className="seed-media-list">
                  {mediaLinks.map((item, i) => {
                    if (typeof item === 'string') {
                      return (
                        <a key={i} href={item} target="_blank" rel="noreferrer" className="seed-branch-card">
                          <div className="seed-branch-card__top">
                            <span className="seed-branch-card__title">{extractTitle(item)}</span>
                            <span className="seed-branch-card__publisher">{extractDomain(item)}</span>
                          </div>
                          <span className="seed-branch-card__url">{item}</span>
                        </a>
                      );
                    }
                    const imgSrc = item.previewUrl || `file:///${(item.path || '').replace(/\\/g, '/')}`;
                    return (
                      <div key={i} className="seed-media-image">
                        <div className="seed-media-image__frame" onClick={() => setViewerSrc(imgSrc)}>
                          <img src={imgSrc} alt={item.name} />
                        </div>
                        <span className="seed-media-image__name">{item.name}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="seed-media-empty">Nothing planted yet</p>
              )}
            </section>

            {/* Branches */}
            <section className="seed-section">
              <div className="seed-section__header">
                <h2 className="seed-section__label">Branches:</h2>
                <button
                  type="button"
                  className="seed-search-btn"
                  disabled={branchesLoading}
                  onClick={searchBranches}
                >
                  {branchesLoading ? 'Searching…' : 'Search now'}
                </button>
              </div>
              {searchDone && (
                <p className="seed-branches-done">
                  Done! Relevant branches are now updated in Activity.
                </p>
              )}
              <textarea
                className="seed-search-prompt"
                placeholder="What specifically are you looking for? Hermes will use this alongside your seed's context. (optional)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                rows={3}
              />
              {branchesError && (
                <p className="seed-section__sub" style={{ color: 'red', margin: '8px 0 0' }}>
                  {branchesError}
                </p>
              )}
              {likedBranches.length > 0 && (
                <div className="seed-branches-saved">
                  <span className="seed-branches-saved__label">Saved</span>
                  <div className="seed-branches-list">
                    {likedBranches.map((b, i) => (
                      <a key={i} href={b.url} target="_blank" rel="noreferrer" className="seed-branch-card">
                        <span className="seed-branch-card__title">{b.title}</span>
                        <span className="seed-branch-card__url">{b.url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Roots */}
            <section className="seed-section">
              <div className="seed-section__header">
                <h2 className="seed-section__label">Roots:</h2>
                <button
                  type="button"
                  className="seed-search-btn"
                  disabled={rootsLoading}
                  onClick={findRoots}
                >
                  {rootsLoading ? 'Searching…' : 'Find Roots'}
                </button>
              </div>
              {rootsError && (
                <p className="seed-section__sub" style={{ color: 'red', margin: '8px 0 0' }}>
                  {rootsError}
                </p>
              )}
              <p className="seed-section__sub" style={{ margin: '0 0 8px' }}>
                Similarities between seeds identified by Fallow
              </p>
              {rootsDone && (
                <p className="seed-roots-done">
                  Done! Roots between seeds identified.
                </p>
              )}
              <div className="seed-roots-row">
                {displayedRootsList.map((root) => (
                  <div key={root.id} className="seed-root-card">
                    <div
                      className="seed-root-card__header"
                      style={{ background: root.color }}
                    >
                      {root.title}
                    </div>
                    <div className="seed-root-card__body">
                      {root.description}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="seed-footer" ref={returnRef}>
            {isEditing ? (
              <>
                <button type="button" className="seed-edit-btn seed-edit-btn--discard" onClick={handleDiscardEdits}>
                  <img src={deleteIcon} alt="" width="16" height="16" />
                  Discard Edits
                </button>
                <button type="button" className="seed-edit-btn seed-edit-btn--apply" onClick={handleApplyEdits}>
                  <img src={yesIcon} alt="" width="16" height="16" />
                  Apply Edits
                </button>
              </>
            ) : (
              <Link to="/garden" className="seed-return-btn">
                <img src={returnIcon} alt="" width="14" height="14" />
                Return
              </Link>
            )}
          </div>
        </div>
        {showGradient && (
          <div className="seed-gradient-fade" aria-hidden="true" />
        )}
      </div>
    </div>
    </>
  );
}
