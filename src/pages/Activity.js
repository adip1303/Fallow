import { useState, useRef, useEffect, useMemo } from 'react';
import './Activity.css';
import searchIcon from '../icons/search.svg';
import dropdownIcon from '../icons/dropdown.svg';
import openLinkIcon from '../icons/open-link.svg';
import moreIcon from '../icons/more.svg';
import likeIcon from '../icons/like.svg';
import dislikeIcon from '../icons/dislike.svg';
import { seedColor } from '../data/categoryColors';
import { useStore } from '../hooks/useStore';
import { filterVisibleSeeds, HIDDEN_SEEDS_KEY, readUserSeeds, USER_SEEDS_KEY } from '../utils/seedStorage';
import {
  BRANCH_LOG_CHANGED_EVENT,
  BRANCH_LOG_KEY,
  markBranchLogSeen,
  notifyBranchLogChanged,
  readBranchLog,
} from '../utils/branchLogNotifications';

const SORT_OPTIONS = ['Last Updated', 'Most Branches'];

function extractPublisher(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function BranchRow({ branch, url, onLike, onDislike }) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, right: 0 });
  const popoverRef = useRef(null);
  const moreBtnRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        moreBtnRef.current &&
        !moreBtnRef.current.contains(e.target)
      ) {
        setPopoverOpen(false);
      }
    }
    if (popoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [popoverOpen]);

  const handleMoreClick = () => {
    if (!popoverOpen && moreBtnRef.current) {
      const rect = moreBtnRef.current.getBoundingClientRect();
      setPopoverPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setPopoverOpen((v) => !v);
  };

  return (
    <div className="activity-branch-row">
      <span className="activity-branch-row__dot" />
      <span className="activity-branch-row__title">{branch.title}</span>
      <span className="activity-branch-row__source">{branch.source}</span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="activity-branch-row__link"
          aria-label="Open link in new tab"
          onClick={(e) => e.stopPropagation()}
        >
          <img src={openLinkIcon} alt="" />
        </a>
      ) : (
        <img src={openLinkIcon} alt="" className="activity-branch-row__link" />
      )}
      <button
        ref={moreBtnRef}
        className="activity-branch-row__more"
        onClick={handleMoreClick}
        aria-label="More options"
      >
        <img src={moreIcon} alt="" />
      </button>
      <div
        ref={popoverRef}
        className={`activity-popover${popoverOpen ? ' is-open' : ''}`}
        aria-hidden={!popoverOpen}
        style={{ position: 'fixed', top: popoverPos.top, right: popoverPos.right }}
      >
        <button
          className="activity-popover__option activity-popover__option--like"
          tabIndex={popoverOpen ? 0 : -1}
          onClick={() => { onLike && onLike(branch); setPopoverOpen(false); }}
        >
          <img src={likeIcon} alt="" />
          <span className="activity-popover__text">
            <span className="activity-popover__title">Like</span>
            <span className="activity-popover__subtitle">
              See more like this branch
            </span>
          </span>
        </button>
        <button
          className="activity-popover__option activity-popover__option--dislike"
          tabIndex={popoverOpen ? 0 : -1}
          onClick={() => { onDislike && onDislike(branch); setPopoverOpen(false); }}
        >
          <img src={dislikeIcon} alt="" />
          <span className="activity-popover__text">
            <span className="activity-popover__title">Dislike</span>
            <span className="activity-popover__subtitle">
              See less like this branch
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}

function parseActivityDate(value) {
  if (!value) return 0;
  const parsed = new Date(value);
  if (!isNaN(parsed)) return parsed.getTime();
  const [day, month, year] = value.split('/').map(Number);
  if (day && month && year) return new Date(year, month - 1, day).getTime();
  return 0;
}

function formatActivityDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date)) return value;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
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
    createdAt: seed.createdAt || '',
    updatedAt: seed.updatedAt || '',
    added: seed.added || '',
  };
}

function normalizeBranches(branches, seedId) {
  return (Array.isArray(branches) ? branches : [])
    .filter((branch) => branch?.title || branch?.url)
    .map((branch, index) => ({
      id: branch.id || `${seedId}-${index}`,
      title: branch.title || branch.url,
      source: branch.source || branch.publisher || extractPublisher(branch.url || ''),
      url: branch.url || '',
    }));
}

function branchesFromStore(storeBranches, seedId) {
  const value = storeBranches?.[seedId];
  if (!value) return [];
  return normalizeBranches(value.results || value.branches || value, seedId);
}

function mergeSeeds(...seedGroups) {
  const byId = new Map();
  seedGroups.flat().forEach((seed) => {
    if (!seed?.id) return;
    byId.set(String(seed.id), normalizeSeed(seed));
  });
  return filterVisibleSeeds(Array.from(byId.values()));
}

function buildActivityItems(seeds, branchLog, storeBranches, expandedIds) {
  const logEntries = Array.isArray(branchLog) ? branchLog : [];
  const logBySeedId = new Map(logEntries.map((entry) => [String(entry.seedId), entry]));

  return seeds
    .map((seed) => {
      const logEntry = logBySeedId.get(String(seed.id))
        || logEntries.find((entry) => entry.seedTitle === seed.title);
      const branches = logEntry
        ? normalizeBranches(logEntry.branches, seed.id)
        : branchesFromStore(storeBranches, seed.id);
      if (!branches.length) return null;

      const date = logEntry?.date
        || formatActivityDate(storeBranches?.[seed.id]?.updatedAt)
        || formatActivityDate(seed.updatedAt || seed.createdAt)
        || seed.added;

      return {
        id: seed.id,
        title: seed.title,
        color: seedColor(seed.title),
        branchCount: branches.length,
        date,
        branches,
        expanded: expandedIds.has(String(seed.id)),
        sortTime: parseActivityDate(logEntry?.date || storeBranches?.[seed.id]?.updatedAt || seed.updatedAt || seed.createdAt || seed.added),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.sortTime - a.sortTime || a.title.localeCompare(b.title));
}

export default function Activity() {
  const { seeds: storeSeeds, branches: storeBranches } = useStore();
  const [userSeeds, setUserSeeds] = useState(() => filterVisibleSeeds(readUserSeeds()));
  const [branchLog, setBranchLog] = useState(readBranchLog);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const bodyRefs = useRef({});
  const sortRef = useRef(null);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);
  const [sortOpen, setSortOpen] = useState(false);
  const allSeeds = useMemo(
    () => mergeSeeds(userSeeds, storeSeeds),
    [storeSeeds, userSeeds],
  );
  const items = useMemo(
    () => buildActivityItems(allSeeds, branchLog, storeBranches, expandedIds),
    [allSeeds, branchLog, expandedIds, storeBranches],
  );
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sortBy === 'Most Branches') {
        return b.branchCount - a.branchCount || b.sortTime - a.sortTime || a.title.localeCompare(b.title);
      }
      return b.sortTime - a.sortTime || a.title.localeCompare(b.title);
    });
  }, [items, sortBy]);

  useEffect(() => {
    const refreshItems = () => {
      setUserSeeds(filterVisibleSeeds(readUserSeeds()));
      setBranchLog(readBranchLog());
    };
    function onStorage(e) {
      if (!e.key || e.key === USER_SEEDS_KEY || e.key === HIDDEN_SEEDS_KEY || e.key === BRANCH_LOG_KEY) {
        refreshItems();
      }
    }
    window.addEventListener('focus', refreshItems);
    window.addEventListener('storage', onStorage);
    function onBranchLogChanged(e) {
      if (e.detail?.source === 'seen') return;
      refreshItems();
    }
    window.addEventListener(BRANCH_LOG_CHANGED_EVENT, onBranchLogChanged);
    window.addEventListener('fallow:hiddenSeedsChanged', refreshItems);
    return () => {
      window.removeEventListener('focus', refreshItems);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(BRANCH_LOG_CHANGED_EVENT, onBranchLogChanged);
      window.removeEventListener('fallow:hiddenSeedsChanged', refreshItems);
    };
  }, []);

  useEffect(() => {
    markBranchLogSeen(branchLog);
  }, [branchLog]);

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

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleLike = (itemId, branch) => {
    const seedTitle = items.find((i) => i.id === itemId)?.title;
    if (!seedTitle) return;
    const stored = JSON.parse(localStorage.getItem('fallow:likedBranches') || '{}');
    if (!stored[itemId]) stored[itemId] = { seedTitle, branches: [] };
    if (!stored[itemId].branches.some((b) => b.url === branch.url)) {
      stored[itemId].branches.push({ title: branch.title, source: branch.source, url: branch.url });
    }
    localStorage.setItem('fallow:likedBranches', JSON.stringify(stored));
  };

  const handleDislike = (itemId, branch) => {
    const seedTitle = items.find((i) => i.id === itemId)?.title;
    const log = JSON.parse(localStorage.getItem(BRANCH_LOG_KEY) || '[]');
    const logIdx = log.findIndex((e) => e.seedTitle === seedTitle);
    if (logIdx >= 0) {
      log[logIdx].branches = log[logIdx].branches.filter((b) => b.url !== branch.url);
      localStorage.setItem(BRANCH_LOG_KEY, JSON.stringify(log));
      setBranchLog(log);
      notifyBranchLogChanged();
    }
    const dislikes = JSON.parse(localStorage.getItem('fallow:dislikes') || '{}');
    if (!dislikes[seedTitle]) dislikes[seedTitle] = [];
    dislikes[seedTitle].push({ title: branch.title, url: branch.url });
    localStorage.setItem('fallow:dislikes', JSON.stringify(dislikes));
  };

  return (
    <div className="page activity-page">
      <div className="activity-wrapper">
        <div className="activity-card">
          <div className="activity-header">
            <h1 className="activity-title">Activity</h1>
          </div>

          <div className="activity-controls">
            <div className="activity-search">
              <img src={searchIcon} alt="" className="activity-search__icon" />
              <input
                type="text"
                className="activity-search__input"
                placeholder="Search your seeds..."
              />
            </div>
            <div className="activity-sort" ref={sortRef}>
              <span>Sort By:</span>
              <button
                type="button"
                className="activity-sort__dropdown"
                onClick={() => setSortOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={sortOpen}
              >
                {sortBy}
                <img src={dropdownIcon} alt="" className={`activity-sort__icon ${sortOpen ? 'is-open' : ''}`} />
              </button>
              <div className={`activity-sort__menu ${sortOpen ? 'is-open' : ''}`} role="listbox">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={sortBy === option}
                    className={`activity-sort__option ${sortBy === option ? 'is-selected' : ''}`}
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

          <div className="activity-list">
            {sortedItems.map((item) => (
              <div key={item.id} className="activity-item">
                <div
                  className="activity-item__header"
                  onClick={() => toggleExpand(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleExpand(item.id);
                    }
                  }}
                >
                  <span
                    className="activity-item__dot"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="activity-item__title">{item.title}</span>
                  <span className="activity-item__count">
                    {item.branchCount}{' '}
                    {item.branchCount === 1 ? 'branch' : 'branches'}
                  </span>
                  <span className="activity-item__date">{item.date}</span>
                  <img
                    src={dropdownIcon}
                    alt=""
                    className={`activity-item__chevron ${item.expanded ? 'is-open' : ''}`}
                  />
                </div>

                <div
                  ref={(el) => { bodyRefs.current[item.id] = el; }}
                  className={`activity-item__body ${item.expanded ? 'is-expanded' : ''}`}
                  style={item.expanded && bodyRefs.current[item.id]
                    ? { maxHeight: bodyRefs.current[item.id].scrollHeight + 'px' }
                    : { maxHeight: 0 }}
                >
                  {item.branches.map((branch) => (
                    <BranchRow
                      key={branch.id}
                      branch={branch}
                      url={branch.url}
                      onLike={(b) => handleLike(item.id, b)}
                      onDislike={(b) => handleDislike(item.id, b)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
