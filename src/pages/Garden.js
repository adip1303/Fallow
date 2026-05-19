import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import iconSearch from '../icons/search.svg';
import iconDropdown from '../icons/dropdown.svg';
import iconActivity from '../icons/activity.svg';
import plantSmall from '../plants/plant-small.gif';
import plantMedium from '../plants/plant-medium.gif';
import plantLarge from '../plants/plant-large.gif';
import { categoryColor } from '../data/categoryColors';
import { useStore } from '../hooks/useStore';
import { filterVisibleSeeds, HIDDEN_SEEDS_KEY } from '../utils/seedStorage';
import './Garden.css';

const USER_SEEDS_KEY = 'fallow:userSeeds';

function plantFor(branches) {
  if (branches >= 6) return plantLarge;
  if (branches >= 3) return plantMedium;
  return plantSmall;
}

function parseDate(dmy) {
  if (!dmy) return 0;
  // ISO format from store (e.g. 2026-05-04T00:00:00.000Z)
  if (dmy.includes('T')) return new Date(dmy).getTime();
  // DD/MM/YYYY format from hardcoded seeds
  const [d, m, y] = dmy.split('/').map(Number);
  return new Date(y, m - 1, d).getTime();
}

function formatDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date)) return '';
  return [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    date.getFullYear(),
  ].join('/');
}

function normalizeSeed(seed) {
  return {
    ...seed,
    id: seed.id,
    title: seed.title || '',
    desc: seed.desc || seed.context || '',
    tags: Array.isArray(seed.tags) ? seed.tags : [],
    branches: Number(seed.branches ?? seed.branchCount ?? 0),
    added: seed.added || formatDate(seed.createdAt),
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

function mergeSeeds(...seedGroups) {
  const byId = new Map();
  seedGroups.flat().forEach((seed) => {
    if (!seed?.id) return;
    byId.set(String(seed.id), normalizeSeed(seed));
  });
  return filterVisibleSeeds(Array.from(byId.values()));
}

const SORTS = {
  'Most Recent': (a, b) => parseDate(b.added) - parseDate(a.added),
  Oldest: (a, b) => parseDate(a.added) - parseDate(b.added),
  'Most Branches': (a, b) => b.branches - a.branches,
  'Title (A-Z)': (a, b) => a.title.localeCompare(b.title),
};

export default function Garden() {
  const navigate = useNavigate();
  const { seeds: storeSeeds } = useStore();
  const [userSeeds, setUserSeeds] = useState(readUserSeeds);
  const allSeeds = useMemo(
    () => mergeSeeds(storeSeeds, userSeeds),
    [storeSeeds, userSeeds],
  );
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('Most Recent');
  const [notifiedIds] = useState(
    () => new Set(JSON.parse(localStorage.getItem('fallow:resurfacedSeeds') || '[]')),
  );
  const [branchCounts, setBranchCounts] = useState(() => {
    const log = JSON.parse(localStorage.getItem('fallow:branchLog') || '[]');
    return Object.fromEntries(log.map((e) => [e.seedId, e.branches.length]));
  });

  // Background Hermes intelligence — silently no-ops outside Electron

  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);

  useEffect(() => {
    if (!sortOpen) return undefined;
    function onClick(e) {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [sortOpen]);

  useEffect(() => {
    const log = JSON.parse(localStorage.getItem('fallow:branchLog') || '[]');
    setBranchCounts(Object.fromEntries(log.map((e) => [e.seedId, e.branches.length])));
  }, []);

  useEffect(() => {
    function refreshUserSeeds() {
      setUserSeeds(readUserSeeds());
    }

    function onStorage(e) {
      if (e.key === USER_SEEDS_KEY || e.key === HIDDEN_SEEDS_KEY) refreshUserSeeds();
    }

    window.addEventListener('focus', refreshUserSeeds);
    window.addEventListener('storage', onStorage);
    window.addEventListener('fallow:hiddenSeedsChanged', refreshUserSeeds);
    return () => {
      window.removeEventListener('focus', refreshUserSeeds);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('fallow:hiddenSeedsChanged', refreshUserSeeds);
    };
  }, []);

  const enrichedSeeds = useMemo(
    () => allSeeds.map((s) => ({ ...s, branches: branchCounts[s.id] ?? s.branches })),
    [allSeeds, branchCounts],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? enrichedSeeds.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.tags.some((t) => t.toLowerCase().includes(q)) ||
            s.desc.toLowerCase().includes(q),
        )
      : enrichedSeeds;
    return [...filtered].sort(SORTS[sort]);
  }, [query, sort, enrichedSeeds]);

  const isEmpty = allSeeds.length === 0;

  return (
    <div className="garden">
      <div className="garden__top">
        <div className="garden__search">
          <img className="garden__search-icon" src={iconSearch} alt="" />
          <input
            className="garden__search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your seeds..."
            aria-label="Search seeds"
          />
        </div>
        <div className="garden__sort" ref={sortRef}>
          <span className="garden__sort-label">Sort By:</span>
          <button
            type="button"
            className="garden__sort-trigger"
            onClick={() => setSortOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
            aria-label="Sort seeds"
          >
            <span>{sort}</span>
            <img
              className={`garden__sort-icon${sortOpen ? ' is-open' : ''}`}
              src={iconDropdown}
              alt=""
            />
          </button>
          <div
            className={`garden__sort-menu${sortOpen ? ' is-open' : ''}`}
            role="listbox"
            aria-hidden={!sortOpen}
          >
            {Object.keys(SORTS).map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={sort === option}
                tabIndex={sortOpen ? 0 : -1}
                className={`garden__sort-option${sort === option ? ' is-selected' : ''}`}
                onClick={() => {
                  setSort(option);
                  setSortOpen(false);
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="garden__empty">
          <p className="garden__empty-soft">Your garden's looking a little empty</p>
          <p className="garden__empty-cta">Add a seed to start off!</p>
        </div>
      ) : (
        <div className="garden__grid">
          {visible.map((seed) => (
            <article
              key={seed.id}
              className="seed"
              onClick={() => navigate(`/seeds/${seed.id}`)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/seeds/${seed.id}`);
              }}
            >
              <div className="seed__plant">
                <img src={plantFor(seed.branches)} alt="" />
              </div>
              <div className="seed__caption">
                <span className="seed__caption-inner">
                  <span className="seed__caption-text">{seed.title}</span>
                  {notifiedIds.has(seed.id) ? (
                    <img className="seed__caption-icon" src={iconActivity} alt="" />
                  ) : null}
                </span>
              </div>
              <div className="seed__card">
                <h3 className="seed__title">{seed.title}</h3>
                <div className="seed__tags">
                  {seed.tags.map((t) => (
                    <span
                      key={t}
                      className="seed__tag"
                      style={{ background: categoryColor(t) }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <p className="seed__desc">{seed.desc}</p>
                <div className="seed__meta">
                  <span className="seed__meta-text">
                    {seed.branches} {seed.branches === 1 ? 'Branch' : 'Branches'}
                  </span>
                  <span className="seed__meta-text">
                    Added: <span className="seed__meta-date">{seed.added}</span>
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
