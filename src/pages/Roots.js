import { useEffect, useMemo, useRef, useState } from 'react';
import './Roots.css';
import searchIcon from '../icons/search.svg';
import dropdownIcon from '../icons/dropdown.svg';
import openLinkIcon from '../icons/open-link.svg';
import { buildRootsDisplay } from '../utils/hermesRoots';
import {
  buildPairSpecificRootDescription,
  countRootDescriptions,
  needsPairSpecificRootDescription,
} from '../utils/rootDescriptions';
import { categoryColor } from '../data/categoryColors';
import { useStore } from '../hooks/useStore';
import { filterVisibleSeeds, HIDDEN_SEEDS_KEY, readUserSeeds, USER_SEEDS_KEY } from '../utils/seedStorage';

const ROOTS_KEY = 'fallow:roots';
const SORT_OPTIONS = ['Last Updated', 'Most Roots'];

function parseDate(value) {
  if (!value) return 0;
  if (value.includes('T')) return new Date(value).getTime();
  const [day, month, year] = value.split('/').map(Number);
  if (day && month && year) return new Date(year, month - 1, day).getTime();
  const parsed = new Date(value);
  return isNaN(parsed) ? 0 : parsed.getTime();
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date)) return value;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function normalizeSeed(seed) {
  return {
    ...seed,
    id: seed.id,
    title: seed.title || '',
    tags: Array.isArray(seed.tags) ? seed.tags : [],
    context: seed.context || seed.desc || '',
    added: seed.added || formatDate(seed.createdAt),
    updatedAt: seed.updatedAt || seed.createdAt || seed.added || '',
  };
}

function mergeSeeds(...seedGroups) {
  const byId = new Map();
  seedGroups.flat().forEach((seed) => {
    if (!seed?.id) return;
    byId.set(String(seed.id), normalizeSeed(seed));
  });
  return filterVisibleSeeds(Array.from(byId.values()));
}

function findSeed(seeds, match) {
  return seeds.find((seed) =>
    String(seed.id) === String(match?.id) || seed.title === match?.title
  );
}

function readLocalRoots() {
  try {
    return JSON.parse(localStorage.getItem(ROOTS_KEY) || 'null');
  } catch {
    return null;
  }
}

function buildAllSeedRoots(seeds, roots) {
  return seeds
    .map((seed) => {
      const root = roots.find((entry) =>
        String(entry.id) === String(seed.id) || entry.title === seed.title
      );
      const connections = root?.seeds || [];
      return {
        id: seed.id,
        title: seed.title,
        color: categoryColor(seed.tags[0]),
        rootCount: connections.length,
        date: seed.added || formatDate(seed.updatedAt),
        seeds: connections,
        latest: parseDate(seed.updatedAt || seed.added),
      };
    })
    .sort((a, b) => b.latest - a.latest || a.title.localeCompare(b.title));
}

export default function Roots() {
  const { seeds: storeSeeds } = useStore();
  const [userSeeds, setUserSeeds] = useState(() => filterVisibleSeeds(readUserSeeds()));
  const [localRoots, setLocalRoots] = useState(readLocalRoots);
  const realSeeds = useMemo(
    () => mergeSeeds(userSeeds, storeSeeds),
    [userSeeds, storeSeeds],
  );
  const computedRoots = useMemo(() => {
    const built = buildRootsDisplay(localRoots, realSeeds);
    return buildAllSeedRoots(realSeeds, built);
  }, [localRoots, realSeeds]);
  const displayedRoots = useMemo(() => {
    const descriptionCounts = countRootDescriptions(computedRoots);
    return computedRoots.map((root) => {
      const rootSeed = findSeed(realSeeds, root) || root;
      return {
        ...root,
        seeds: root.seeds.map((connectedSeed) => {
          const seedMatch = findSeed(realSeeds, connectedSeed) || connectedSeed;
          const descriptionKey = (connectedSeed.explanation || '').replace(/\s+/g, ' ').trim().toLowerCase();
          const duplicateCount = descriptionCounts.get(descriptionKey) || 0;
          const explanation = needsPairSpecificRootDescription(
            connectedSeed.explanation,
            rootSeed,
            seedMatch,
            duplicateCount,
          )
            ? buildPairSpecificRootDescription(rootSeed, seedMatch)
            : connectedSeed.explanation;
          return { ...connectedSeed, explanation };
        }),
      };
    });
  }, [computedRoots, realSeeds]);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [openExplanation, setOpenExplanation] = useState({});
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);
  const sortedRoots = useMemo(() => {
    return [...displayedRoots].sort((a, b) => {
      if (sortBy === 'Most Roots') {
        return b.rootCount - a.rootCount || b.latest - a.latest || a.title.localeCompare(b.title);
      }
      return b.latest - a.latest || a.title.localeCompare(b.title);
    });
  }, [displayedRoots, sortBy]);

  useEffect(() => {
    let lastRootsValue = localStorage.getItem(ROOTS_KEY);

    function refreshSavedData() {
      setUserSeeds(filterVisibleSeeds(readUserSeeds()));
      setLocalRoots(readLocalRoots());
      lastRootsValue = localStorage.getItem(ROOTS_KEY);
    }

    function onStorage(e) {
      if (e.key === USER_SEEDS_KEY || e.key === ROOTS_KEY || e.key === HIDDEN_SEEDS_KEY) refreshSavedData();
    }

    function checkRootsValue() {
      const nextRootsValue = localStorage.getItem(ROOTS_KEY);
      if (nextRootsValue === lastRootsValue) return;
      refreshSavedData();
    }

    const refreshTimer = window.setInterval(checkRootsValue, 1000);
    window.addEventListener('focus', refreshSavedData);
    window.addEventListener('storage', onStorage);
    window.addEventListener('visibilitychange', refreshSavedData);
    window.addEventListener('fallow:rootsChanged', refreshSavedData);
    window.addEventListener('fallow:hiddenSeedsChanged', refreshSavedData);
    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', refreshSavedData);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('visibilitychange', refreshSavedData);
      window.removeEventListener('fallow:rootsChanged', refreshSavedData);
      window.removeEventListener('fallow:hiddenSeedsChanged', refreshSavedData);
    };
  }, []);

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

  const toggleExpand = (rootId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      const key = String(rootId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleExplanation = (rootId, seedId) => {
    const key = `${rootId}-${seedId}`;
    setOpenExplanation((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="page roots-page">
      <div className="roots-wrapper">
        <div className="roots-card">
          <div className="roots-header">
            <h1 className="roots-title">Roots</h1>
            <p className="roots-subtext">
              Similarities in seeds identified by Fallow
            </p>
          </div>

          <div className="roots-controls">
            <div className="roots-search">
              <img src={searchIcon} alt="" className="roots-search__icon" />
              <input
                type="text"
                className="roots-search__input"
                placeholder="Search your seeds..."
              />
            </div>
            <div className="roots-sort" ref={sortRef}>
              <span>Sort By:</span>
              <button
                type="button"
                className="roots-sort__dropdown"
                onClick={() => setSortOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={sortOpen}
              >
                {sortBy}
                <img src={dropdownIcon} alt="" className={`roots-sort__icon ${sortOpen ? 'is-open' : ''}`} />
              </button>
              <div className={`roots-sort__menu ${sortOpen ? 'is-open' : ''}`} role="listbox">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={sortBy === option}
                    className={`roots-sort__option ${sortBy === option ? 'is-selected' : ''}`}
                    tabIndex={sortOpen ? 0 : -1}
                    onClick={() => {
                      setSortBy(option);
                      setSortOpen(false);
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="roots-list">
            {sortedRoots.length === 0 ? (
              <div className="roots-empty">
                Add categories to your seeds or run Find Roots from a seed to see similarities here.
              </div>
            ) : sortedRoots.map((root) => {
              const isExpanded = expandedIds.has(String(root.id));
              return (
              <div key={root.id} className="roots-item">
                <div
                  className="roots-item__header"
                  onClick={() => toggleExpand(root.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleExpand(root.id);
                    }
                  }}
                >
                  <span
                    className="roots-item__dot"
                    style={{ backgroundColor: root.color }}
                  />
                  <span className="roots-item__title">{root.title}</span>
                  <span className="roots-item__count">
                    {root.rootCount} {root.rootCount === 1 ? 'root' : 'roots'}
                  </span>
                  <span className="roots-item__date">{root.date}</span>
                  <img
                    src={dropdownIcon}
                    alt=""
                    className={`roots-item__chevron ${isExpanded ? 'is-open' : ''}`}
                  />
                </div>

                <div className={`roots-item__body ${isExpanded ? 'is-expanded' : ''}`}>
                    {root.seeds.length === 0 && (
                      <div className="roots-no-roots">
                        No roots found yet.
                      </div>
                    )}
                    {root.seeds.map((seed, index) => {
                      const key = `${root.id}-${seed.id}`;
                      const isOpen = !!openExplanation[key];
                      return (
                        <div key={seed.id}>
                          <div
                            className="roots-seed-row"
                            onClick={() => toggleExplanation(root.id, seed.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleExplanation(root.id, seed.id);
                              }
                            }}
                          >
                            <span
                              className={`roots-seed-row__indicator ${index === 0 ? '' : 'is-empty'}`}
                            />
                            <span className="roots-seed-row__title">
                              {seed.title}
                            </span>
                            <div className="roots-seed-row__tags">
                              {seed.tags.map((tag) => (
                                <span
                                  key={tag.label}
                                  className="roots-seed-row__tag"
                                  style={{ backgroundColor: tag.color }}
                                >
                                  {tag.label}
                                </span>
                              ))}
                            </div>
                            <span className="roots-seed-row__date">
                              {seed.date}
                            </span>
                            <img
                              src={openLinkIcon}
                              alt=""
                              className="roots-seed-row__link"
                            />
                          </div>
                          <div className={`roots-explanation ${isOpen ? 'is-open' : ''}`}>
                              <p className="roots-explanation__text">
                                {seed.explanation}
                              </p>
                            </div>
                        </div>
                      );
                    })}
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
