import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logoSmall from '../../logo/logo-small.svg';
import iconSeeds from '../../icons/seeds.svg';
import iconCategories from '../../icons/categories.svg';
import iconRoots from '../../icons/roots.svg';
import iconConditions from '../../icons/condition.svg';
import iconActivity from '../../icons/activity.svg';
import iconAdd from '../../icons/add.svg';
import iconDropdown from '../../icons/dropdown.svg';
import iconSeedSmall from '../../icons/seed-small.svg';
import {
  BRANCH_LOG_CHANGED_EVENT,
  BRANCH_LOG_KEY,
  BRANCH_LOG_SEEN_KEY,
  branchLogNotificationCount,
} from '../../utils/branchLogNotifications';
import './Sidebar.css';

const GARDEN_NAV = [
  { to: '/garden', label: 'Seeds', icon: iconSeeds },
  { to: '/categories', label: 'Categories', icon: iconCategories },
  { to: '/roots', label: 'Roots', icon: iconRoots },
  { to: '/conditions', label: 'Conditions', icon: iconConditions },
  { to: '/activity', label: 'Activity', icon: iconActivity },
];

export default function Sidebar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activityBadge, setActivityBadge] = useState(() => branchLogNotificationCount());
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  useEffect(() => {
    const refreshActivityBadge = () => {
      setActivityBadge(branchLogNotificationCount());
    };

    function onStorage(e) {
      if (!e.key || e.key === BRANCH_LOG_KEY || e.key === BRANCH_LOG_SEEN_KEY) {
        refreshActivityBadge();
      }
    }

    window.addEventListener('focus', refreshActivityBadge);
    window.addEventListener('storage', onStorage);
    window.addEventListener(BRANCH_LOG_CHANGED_EVENT, refreshActivityBadge);
    return () => {
      window.removeEventListener('focus', refreshActivityBadge);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(BRANCH_LOG_CHANGED_EVENT, refreshActivityBadge);
    };
  }, []);

  function handleNew(path) {
    setMenuOpen(false);
    navigate(path);
  }

  return (
    <aside className={`sidebar${menuOpen ? ' is-new-open' : ''}`} aria-label="Primary">
      <div className="sidebar__brand">
        <img className="sidebar__logo" src={logoSmall} alt="" />
        <div className="sidebar__wordmark">Fallow</div>
      </div>

      <div className="sidebar__new" ref={menuRef}>
        <button
          type="button"
          className="sidebar__new-btn"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <img className="sidebar__new-icon" src={iconAdd} alt="" />
          <span className="sidebar__new-label">New</span>
          <img
            className={`sidebar__new-caret${menuOpen ? ' is-open' : ''}`}
            src={iconDropdown}
            alt=""
          />
        </button>
        <div
          className={`sidebar__dropdown${menuOpen ? ' is-open' : ''}`}
          role="menu"
          aria-hidden={!menuOpen}
        >
            <button
              type="button"
              role="menuitem"
              className="sidebar__dropdown-item"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => handleNew('/seeds/new')}
            >
              <img className="sidebar__dropdown-icon" src={iconSeedSmall} alt="" />
              <span className="sidebar__dropdown-text">
                <span className="sidebar__dropdown-title">New Seed</span>
                <span className="sidebar__dropdown-sub">Store an idea</span>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="sidebar__dropdown-item"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => handleNew('/conditions/new')}
            >
              <img className="sidebar__dropdown-icon" src={iconConditions} alt="" />
              <span className="sidebar__dropdown-text">
                <span className="sidebar__dropdown-title">New Condition</span>
                <span className="sidebar__dropdown-sub">
                  Add a change to available resources
                </span>
              </span>
            </button>
          </div>
      </div>

      <div className="sidebar__section-label">Garden</div>
      <nav className="sidebar__nav">
        {GARDEN_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar__nav-item${isActive ? ' is-active' : ''}`
            }
          >
            <img className="sidebar__nav-icon" src={item.icon} alt="" />
            <span className="sidebar__nav-label">{item.label}</span>
            {item.label === 'Activity' && activityBadge > 0 ? (
              <span className="sidebar__badge">{activityBadge}</span>
            ) : null}
          </NavLink>
        ))}
      </nav>

    </aside>
  );
}
