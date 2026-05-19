import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import addIcon from '../icons/add.svg';
import editIcon from '../icons/edit.svg';
import deleteIcon from '../icons/delete.svg';
import dropdownIcon from '../icons/dropdown.svg';
import './Conditions.css';
import { useStore } from '../hooks/useStore';
import { HIDDEN_SEEDS_KEY, readHiddenSeedIds, readUserSeeds } from '../utils/seedStorage';

const USER_CONDITIONS_KEY = 'fallow:conditions';

function readSavedConditions() {
  try {
    const raw = JSON.parse(localStorage.getItem(USER_CONDITIONS_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function parseConditionDate(condition) {
  const value = condition.updatedAt || condition.createdAt || condition.updated || '';
  if (!value) return 0;
  if (value.includes('T')) return new Date(value).getTime();
  const cleaned = value.replace(/^Updated\s+/i, '');
  const parsed = new Date(cleaned);
  if (!isNaN(parsed)) return parsed.getTime();
  const [day, month, year] = cleaned.split('/').map(Number);
  if (day && month && year) return new Date(year, month - 1, day).getTime();
  return 0;
}

function normalizeCondition(condition, index) {
  return {
    id: condition.id ?? `${condition.title}-${index}`,
    title: condition.title || '',
    context: condition.context || '',
    active: Boolean(condition.active),
    updated: condition.updated || condition.createdAt || 'Updated recently',
    affectedSeeds: Array.isArray(condition.affectedSeeds)
      ? condition.affectedSeeds
      : [],
    sortTime: parseConditionDate(condition),
    sourceIndex: index,
  };
}

function mergeConditions(...conditionGroups) {
  const byKey = new Map();
  conditionGroups.flat().forEach((condition, index) => {
    if (!condition?.title && !condition?.id) return;
    const normalized = normalizeCondition(condition, index);
    const key = String(normalized.id || normalized.title);
    byKey.set(key, normalized);
  });

  return Array.from(byKey.values()).sort(
    (a, b) => b.sortTime - a.sortTime || a.sourceIndex - b.sourceIndex,
  );
}

export default function Conditions() {
  const navigate = useNavigate();
  const { conditions: storeConditions } = useStore();

  const [savedConditions, setSavedConditions] = useState(readSavedConditions);
  const [hiddenSeedTitles, setHiddenSeedTitles] = useState(() => {
    const hiddenIds = readHiddenSeedIds();
    return new Set(
      readUserSeeds()
        .filter((seed) => hiddenIds.has(String(seed.id)))
        .map((seed) => seed.title),
    );
  });
  const [expandedIds, setExpandedIds] = useState(new Set());

  const conditions = useMemo(
    () => mergeConditions(savedConditions, storeConditions).map((condition) => ({
      ...condition,
      affectedSeeds: condition.affectedSeeds.filter((seed) => !hiddenSeedTitles.has(seed)),
    })),
    [hiddenSeedTitles, savedConditions, storeConditions],
  );

  useEffect(() => {
    function refreshSavedConditions() {
      setSavedConditions(readSavedConditions());
      const hiddenIds = readHiddenSeedIds();
      setHiddenSeedTitles(new Set(
        readUserSeeds()
          .filter((seed) => hiddenIds.has(String(seed.id)))
          .map((seed) => seed.title),
      ));
    }

    function onStorage(e) {
      if (e.key === USER_CONDITIONS_KEY || e.key === HIDDEN_SEEDS_KEY) refreshSavedConditions();
    }

    window.addEventListener('focus', refreshSavedConditions);
    window.addEventListener('storage', onStorage);
    window.addEventListener('fallow:hiddenSeedsChanged', refreshSavedConditions);
    return () => {
      window.removeEventListener('focus', refreshSavedConditions);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('fallow:hiddenSeedsChanged', refreshSavedConditions);
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

  function toggleActive(id) {
    setSavedConditions((prev) => {
      const next = prev.map((condition) =>
        condition.id === id
          ? { ...condition, active: !condition.active }
          : condition,
      );
      localStorage.setItem(USER_CONDITIONS_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="page conditions-page">
      <div className="conditions-wrapper">
        <div className="conditions-card">
          {/* Header */}
          <div className="conditions-header">
            <h1 className="conditions-title">Conditions</h1>
            <button
              type="button"
              className="conditions-add-btn"
              onClick={() => navigate('/conditions/new')}
            >
              <img
                src={addIcon}
                alt=""
                width="16"
                height="16"
                style={{ display: 'block' }}
              />
              Add Condition
            </button>
          </div>

          <p className="conditions-subtitle">Number of Conditions: {conditions.length}</p>

          {/* Summary */}
          <div className="conditions-summary">
            <div className="conditions-summary__header">
              <h2 className="conditions-summary__title">Summary</h2>
              <span className="conditions-summary__date">
                (Updated by Fallow on 28/04/2026)
              </span>
            </div>
            <div className="conditions-summary__box">
              Currently, Adhip has access to traditional Industrial Design tools
              such as SolidWorks and KeyShot, along with digital tools such as
              Figma and Affinity. He has a Claude Pro subscription, and has
              access to AI design tools such as Vizcom as well.
            </div>
          </div>

          <div className="conditions-divider" />

          {/* List Controls */}
          <div className="conditions-list-controls">
            <span className="conditions-list-controls__label">Sort By:</span>
            <button type="button" className="conditions-dropdown">
              <span>Last Updated</span>
              <img src={dropdownIcon} alt="" width="12" height="12" />
            </button>
          </div>

          {/* Condition Cards */}
          <div className="conditions-list">
            {conditions.map((condition) => {
              const isExpanded = expandedIds.has(condition.id);
              return (
                <div
                  key={condition.id}
                  className={`condition-card${isExpanded ? ' is-expanded' : ''}`}
                >
                  <div className="condition-card__header">
                    <button
                      type="button"
                      className={`condition-card__status${condition.active ? ' is-active' : ''}`}
                      aria-label={`${condition.active ? 'Deactivate' : 'Activate'} ${condition.title}`}
                      aria-pressed={condition.active}
                      onClick={() => toggleActive(condition.id)}
                    />
                    <span className="condition-card__title">
                      {condition.title}
                    </span>
                    <span className="condition-card__timestamp">
                      {condition.updated}
                    </span>
                    <div className="condition-card__actions">
                      <button
                        type="button"
                        className="conditions-icon-btn"
                        aria-label="Edit"
                      >
                        <img src={editIcon} alt="" width="16" height="16" />
                      </button>
                      <button
                        type="button"
                        className="conditions-icon-btn"
                        aria-label="Delete"
                      >
                        <img src={deleteIcon} alt="" width="16" height="16" />
                      </button>
                      <button
                        type="button"
                        className={`conditions-icon-btn conditions-expand-btn${isExpanded ? ' is-open' : ''}`}
                        aria-label="Expand"
                        onClick={() => toggleExpand(condition.id)}
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
                  <div className={`condition-card__body${isExpanded ? ' is-expanded' : ''}`}>
                      {condition.context && (
                        <>
                          <div className="condition-card__label">Context:</div>
                          <div className="condition-card__context">{condition.context}</div>
                        </>
                      )}
                      {condition.affectedSeeds.length > 0 && (
                        <>
                          <div className="condition-card__label">
                            Affected seeds:
                          </div>
                          <div className="condition-card__seeds">
                            {condition.affectedSeeds.map((seed) => (
                              <div
                                key={seed}
                                className="condition-card__seed"
                              >
                                {seed}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
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
