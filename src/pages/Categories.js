import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import addIcon from '../icons/add.svg';
import editIcon from '../icons/edit.svg';
import deleteIcon from '../icons/delete.svg';
import dropdownIcon from '../icons/dropdown.svg';
import {
  CATEGORIES_CHANGED_EVENT,
  CUSTOM_CATEGORIES_KEY,
  getCategoryColors,
  readCustomCategories,
} from '../data/categoryColors';
import { useStore } from '../hooks/useStore';
import { filterVisibleSeeds, HIDDEN_SEEDS_KEY } from '../utils/seedStorage';
import './Categories.css';

const USER_SEEDS_KEY = 'fallow:userSeeds';

function parseDate(value) {
  if (!value) return 0;
  if (value.includes('T')) return new Date(value).getTime();
  const [d, m, y] = value.split('/').map(Number);
  return new Date(y, m - 1, d).getTime();
}

function formatDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date)) return iso;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatUpdated(timestamp) {
  if (!timestamp) return 'Updated recently';
  const updatedAt = new Date(timestamp);
  if (isNaN(updatedAt)) return 'Updated recently';
  const days = Math.max(
    0,
    Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
  );
  if (days === 0) return 'Updated today';
  if (days === 1) return 'Updated 1d ago';
  if (days < 7) return `Updated ${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `Updated ${weeks}w ago`;
  return `Updated ${formatDate(timestamp)}`;
}

function normalizeSeed(seed) {
  const added = seed.added || formatDate(seed.createdAt);
  const timestamp = seed.updatedAt || seed.createdAt || seed.added || '';
  return {
    id: seed.id,
    title: seed.title || '',
    tags: Array.isArray(seed.tags) ? seed.tags : [],
    branches: Number(seed.branches ?? seed.branchCount ?? 0),
    date: added,
    timestamp,
  };
}

function readUserSeeds() {
  try {
    const raw = JSON.parse(localStorage.getItem(USER_SEEDS_KEY) || '[]');
    return Array.isArray(raw) ? filterVisibleSeeds(raw.map(normalizeSeed)) : [];
  } catch {
    return [];
  }
}

function readSavedCategories() {
  return readCustomCategories().map((category) => ({
    id: category.name,
    name: category.name,
    color: category.color,
    latestTimestamp: parseDate(category.updatedAt || category.createdAt),
    latestValue: category.updatedAt || category.createdAt,
    seeds: [],
  }));
}

function mergeSeeds(...seedGroups) {
  const byId = new Map();
  seedGroups.flat().forEach((seed) => {
    if (!seed?.id) return;
    byId.set(String(seed.id), normalizeSeed(seed));
  });
  return filterVisibleSeeds(Array.from(byId.values()));
}

function buildCategories(seeds) {
  const byName = new Map();
  const categoryColors = getCategoryColors();

  seeds.forEach((seed) => {
    seed.tags.forEach((tag) => {
      if (!tag) return;
      const timestampMs = parseDate(seed.timestamp || seed.date);
      if (!byName.has(tag)) {
        byName.set(tag, {
          id: tag,
          name: tag,
          color: categoryColors[tag] || '#D5D0C5',
          latestTimestamp: timestampMs,
          latestValue: seed.timestamp || seed.date,
          seeds: [],
        });
      }

      const category = byName.get(tag);
      category.seeds.push(seed);
      if (timestampMs > category.latestTimestamp) {
        category.latestTimestamp = timestampMs;
        category.latestValue = seed.timestamp || seed.date;
      }
    });
  });

  return Array.from(byName.values())
    .map((category) => ({
      ...category,
      seedCount: category.seeds.length,
      updated: formatUpdated(category.latestValue),
      seeds: [...category.seeds].sort(
        (a, b) => parseDate(b.timestamp || b.date) - parseDate(a.timestamp || a.date),
      ),
    }))
    .sort((a, b) => b.latestTimestamp - a.latestTimestamp || a.name.localeCompare(b.name));
}

export default function Categories() {
  const navigate = useNavigate();
  const { seeds: storeSeeds } = useStore();
  const [userSeeds, setUserSeeds] = useState(readUserSeeds);
  const [savedCategories, setSavedCategories] = useState(readSavedCategories);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const categories = useMemo(() => {
    const byName = new Map(savedCategories.map((category) => [category.name, category]));
    buildCategories(mergeSeeds(storeSeeds, userSeeds)).forEach((category) => {
      byName.set(category.name, category);
    });
    return Array.from(byName.values())
      .map((category) => ({
        ...category,
        seedCount: category.seeds.length,
        updated: category.seeds.length ? category.updated : 'No seeds yet',
      }))
      .sort((a, b) => b.latestTimestamp - a.latestTimestamp || a.name.localeCompare(b.name));
  }, [savedCategories, storeSeeds, userSeeds]);

  useEffect(() => {
    function refreshData() {
      setUserSeeds(readUserSeeds());
      setSavedCategories(readSavedCategories());
    }

    function onStorage(e) {
      if (e.key === USER_SEEDS_KEY || e.key === HIDDEN_SEEDS_KEY || e.key === CUSTOM_CATEGORIES_KEY) refreshData();
    }

    window.addEventListener('focus', refreshData);
    window.addEventListener('storage', onStorage);
    window.addEventListener(CATEGORIES_CHANGED_EVENT, refreshData);
    window.addEventListener('fallow:hiddenSeedsChanged', refreshData);
    return () => {
      window.removeEventListener('focus', refreshData);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CATEGORIES_CHANGED_EVENT, refreshData);
      window.removeEventListener('fallow:hiddenSeedsChanged', refreshData);
    };
  }, []);

  function toggleExpand(id) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="page categories-page">
      <div className="categories-wrapper">
        <div className="categories-card">
          {/* Header */}
          <div className="categories-header">
            <h1 className="categories-title">Categories</h1>
            <button type="button" className="categories-add-btn" onClick={() => navigate('/categories/new')}>
              <img
                src={addIcon}
                alt=""
                width="16"
                height="16"
                style={{ display: 'block' }}
              />
              Add Category
            </button>
          </div>

          <p className="categories-subtitle">
            Number of Categories: {categories.length}
          </p>

          {/* List Controls */}
          <div className="categories-list-controls">
            <span className="categories-list-controls__label">Sort By:</span>
            <button type="button" className="categories-dropdown">
              <span>Last Updated</span>
              <img src={dropdownIcon} alt="" width="12" height="12" />
            </button>
          </div>

          {/* Category Cards */}
          <div className="categories-list">
            {categories.length === 0 ? (
              <div className="categories-empty">
                Add categories to your seeds to see them here.
              </div>
            ) : categories.map((cat) => {
              const isExpanded = expandedIds.has(cat.id);
              return (
                <div
                  key={cat.id}
                  className={`category-card${isExpanded ? ' is-expanded' : ''}`}
                >
                  <div
                    className="category-card__header"
                    onClick={() => toggleExpand(cat.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleExpand(cat.id);
                      }
                    }}
                  >
                    <span
                      className="category-card__dot"
                      style={{ background: cat.color }}
                    />
                    <span className="category-card__title">{cat.name}</span>
                    <span className="category-card__count">
                      {cat.seedCount} seed{cat.seedCount !== 1 ? 's' : ''}
                    </span>
                    <span className="category-card__timestamp">
                      {cat.updated}
                    </span>
                    <div className="category-card__actions">
                      <button
                        type="button"
                        className="categories-icon-btn"
                        aria-label="Edit"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <img src={editIcon} alt="" width="16" height="16" />
                      </button>
                      <button
                        type="button"
                        className="categories-icon-btn"
                        aria-label="Delete"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <img src={deleteIcon} alt="" width="16" height="16" />
                      </button>
                      <button
                        type="button"
                        className={`categories-icon-btn categories-expand-btn${isExpanded ? ' is-open' : ''}`}
                        aria-label="Expand"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(cat.id);
                        }}
                      >
                        <img
                          src={dropdownIcon}
                          alt=""
                          width="16"
                          height="16"
                        />
                      </button>
                    </div>
                  </div>
                  <div className={`category-card__body${isExpanded ? ' is-expanded' : ''}`}>
                      {cat.seeds.map((seed, idx) => (
                        <div
                          key={seed.id}
                          className={`category-seed-row${idx > 0 ? ' has-border' : ''}`}
                        >
                          <span className="category-seed-row__title">
                            {seed.title}
                          </span>
                          <span className="category-seed-row__date">
                            {seed.date}
                          </span>
                          <span className="category-seed-row__branches">
                            {seed.branches} branch{seed.branches !== 1 ? 'es' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
