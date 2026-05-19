import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dropdownIcon from '../icons/dropdown.svg';
import yesIcon from '../icons/yes.svg';
import laterIcon from '../icons/later.svg';
import addIcon from '../icons/add.svg';
import deleteIcon from '../icons/delete.svg';
import { categoryColor } from '../data/categoryColors';
import { checkConditions } from '../services/hermes';
import { useStore } from '../hooks/useStore';
import { filterVisibleSeeds, readUserSeeds } from '../utils/seedStorage';
import './NewCondition.css';

const TIME_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Night', 'Anytime'];

export default function NewCondition() {
  const navigate = useNavigate();
  const { seeds: storeSeeds } = useStore();

  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);

  const [step, setStep] = useState('initial');
  const [scannedSeeds, setScannedSeeds] = useState([]);

  const timeDropdownRef = useRef(null);
  const timeoutsRef = useRef([]);

  // Close time dropdown on outside click
  useEffect(() => {
    if (!timeDropdownOpen) return;
    function onClick(e) {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(e.target)) {
        setTimeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [timeDropdownOpen]);

  // Clear all timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((id) => clearTimeout(id));
    };
  }, []);

  function addTimeout(fn, delay) {
    const id = setTimeout(fn, delay);
    timeoutsRef.current.push(id);
    return id;
  }

  async function handleFirstYes() {
    setStep('scanning');
    try {
      const savedSeeds = filterVisibleSeeds(readUserSeeds());
      const savedIds = new Set(savedSeeds.map((s) => String(s.id)));
      const allSavedSeeds = filterVisibleSeeds([
        ...savedSeeds,
        ...storeSeeds.filter((s) => !savedIds.has(String(s.id))),
      ]);
      const allSeedsForScan = allSavedSeeds
        .filter((s) => s.blocker)
        .map((s) => ({ id: s.id, title: s.title, tags: s.tags, blocker: s.blocker }));
      const result = await checkConditions({ title, context }, allSeedsForScan);
      let unblocked = [];
      if (Array.isArray(result)) {
        unblocked = result;
      } else if (Array.isArray(result.unblocked)) {
        unblocked = result.unblocked;
      } else if (Array.isArray(result.seeds)) {
        unblocked = result.seeds;
      } else if (Array.isArray(result.affected_seeds)) {
        unblocked = result.affected_seeds;
      } else if (Array.isArray(result.unblocked_seeds)) {
        unblocked = result.unblocked_seeds;
      } else if (Array.isArray(result.result?.unblockedSeeds)) {
        unblocked = result.result.unblockedSeeds;
      } else if (Array.isArray(result.unblockedSeeds)) {
        unblocked = result.unblockedSeeds;
      }
      const displaySeeds = unblocked.map((s) => {
        const match = allSeedsForScan.find((seed) => seed.id === s.id || seed.title === s.title);
        const reason = s.analysis || s.reason;
        return match ? { ...match, analysis: reason } : { ...s, analysis: reason };
      });
      setScannedSeeds(displaySeeds);
      setStep('scanned');
      addTimeout(() => setStep('resurfacePrompt'), 2000);
    } catch (err) {
      console.error('Hermes checkConditions failed:', err);
      setStep('initial');
    }
  }

  function handleSecondYes() {
    const existing = JSON.parse(localStorage.getItem('fallow:resurfacedSeeds') || '[]');
    const merged = [...new Set([...existing, ...scannedSeeds.map((s) => s.id)])];
    localStorage.setItem('fallow:resurfacedSeeds', JSON.stringify(merged));

    const today = new Date();
    const date = [
      String(today.getDate()).padStart(2, '0'),
      String(today.getMonth() + 1).padStart(2, '0'),
      today.getFullYear(),
    ].join('/');
    const updatedConditions = JSON.parse(localStorage.getItem('fallow:updatedConditions') || '{}');
    scannedSeeds.forEach((s) => {
      updatedConditions[s.id] = {
        text: s.analysis || `Unblocked by condition: ${title}`,
        date,
      };
    });
    localStorage.setItem('fallow:updatedConditions', JSON.stringify(updatedConditions));
    // When updating conditions, ensure reverted state is cleared so update shows
    const revertedMap = JSON.parse(localStorage.getItem('fallow:revertedConditions') || '{}');
    scannedSeeds.forEach((s) => delete revertedMap[s.id]);
    localStorage.setItem('fallow:revertedConditions', JSON.stringify(revertedMap));

    // Immediately save condition to the list so it appears in /conditions
    const dateStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const saved = JSON.parse(localStorage.getItem('fallow:conditions') || '[]');
    const idx = saved.findIndex((c) => c.title === title);
    const entry = {
      id: idx >= 0 ? saved[idx].id : Date.now(),
      title,
      context,
      active: true,
      updated: `Updated ${dateStr}`,
      affectedSeeds: scannedSeeds.map((s) => s.title),
    };
    if (idx >= 0) saved[idx] = entry;
    else saved.unshift(entry);
    localStorage.setItem('fallow:conditions', JSON.stringify(saved));

    setStep('resurfacing');
    addTimeout(() => setStep('resurfaced'), 2000);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const saved = JSON.parse(localStorage.getItem('fallow:conditions') || '[]');
    // handleSecondYes may have already saved this condition — update instead of duplicate
    const idx = saved.findIndex((c) => c.title === title);
    const entry = {
      id: idx >= 0 ? saved[idx].id : Date.now(),
      title,
      context,
      active: true,
      updated: `Updated ${dateStr}`,
      affectedSeeds: scannedSeeds.map((s) => s.title),
    };
    if (idx >= 0) saved[idx] = entry;
    else saved.unshift(entry);
    localStorage.setItem('fallow:conditions', JSON.stringify(saved));
    navigate('/conditions');
  }

  return (
    <div className="page nc-page">
      <div className="nc-wrapper">
        <div className="nc-card">
          <h1 className="nc-title">New Condition</h1>

          <form onSubmit={handleSubmit} className="nc-form">
            {/* Row 1: Title + Inclusion Time */}
            <div className="nc-row">
              <div className="nc-field nc-field--wide">
                <label className="nc-label">Title:</label>
                <input
                  className="nc-input"
                  placeholder="Add a title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div
                className="nc-field nc-field--narrow"
                ref={timeDropdownRef}
              >
                <label className="nc-label">Inclusion Time:</label>
                <button
                  type="button"
                  className="nc-dropdown-trigger"
                  onClick={() => setTimeDropdownOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={timeDropdownOpen}
                >
                  <span className="nc-dropdown-trigger__text">
                    {selectedTime || 'Select Time'}
                  </span>
                  <img
                    src={dropdownIcon}
                    alt=""
                    className={`nc-dropdown-trigger__icon${
                      timeDropdownOpen ? ' is-open' : ''
                    }`}
                    width="12"
                    height="12"
                  />
                </button>

                <div
                  className={`nc-dropdown-menu${timeDropdownOpen ? ' is-open' : ''}`}
                  role="listbox"
                  aria-hidden={!timeDropdownOpen}
                >
                    {TIME_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        role="option"
                        aria-selected={selectedTime === opt}
                        className="nc-dropdown-item"
                        tabIndex={timeDropdownOpen ? 0 : -1}
                        onClick={() => {
                          setSelectedTime(opt);
                          setTimeDropdownOpen(false);
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
              </div>
            </div>

            {/* Context */}
            <div className="nc-field">
              <label className="nc-label">Context:</label>
              <textarea
                className="nc-textarea"
                placeholder="Describe the condition..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
              />
            </div>

            {/* Resurface section */}
            {step === 'initial' && (
              <div className="nc-resurface">
                <p className="nc-resurface__title">
                  Would you like Fallow to resurface relevant seeds?
                </p>
                <p className="nc-resurface__subtext">
                  Fallow can cross-check your new condition and highlight seeds that benefit most from the new condition
                </p>
                <div className="nc-resurface__actions">
                  <button
                    type="button"
                    className="nc-btn nc-btn--filled nc-btn--pill"
                    onClick={handleFirstYes}
                  >
                    <img src={yesIcon} alt="" width="16" height="16" />
                    Yes
                  </button>
                  <button
                    type="button"
                    className="nc-btn nc-btn--outline nc-btn--pill"
                  >
                    <img src={laterIcon} alt="" width="16" height="16" />
                    Later
                  </button>
                </div>
              </div>
            )}

            {step === 'scanning' && (
              <div className="nc-loading">Scanning...</div>
            )}

            {(step === 'scanned' || step === 'resurfacePrompt' || step === 'resurfacing' || step === 'resurfaced') && (
              <div className="nc-resurface">
                {(step === 'scanned' || step === 'resurfacePrompt' || step === 'resurfacing' || step === 'resurfaced') && (
                  <div className="nc-scanned-result">
                    <div className="nc-fade-in">
                    <p className="nc-results-label">Seeds scanned</p>
                    <p className="nc-results-text">
                      Fallow identified the following seeds as relevant to your new condition!
                    </p>
                    </div>
                    <div className="nc-seed-cards nc-fade-in nc-fade-in--delayed">
                      {scannedSeeds.map((seed) => (
                        <div key={seed.id} className="nc-seed-card">
                          <div
                            className="nc-seed-card__header"
                            style={{ background: categoryColor(seed.tags?.[0]) }}
                          >
                            {seed.title}
                          </div>
                          <div className="nc-seed-card__body">
                            {seed.blocker}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 'resurfacePrompt' && (
                  <div className="nc-resurface-prompt">
                    <p className="nc-resurface__title nc-resurface__title--prompt">
                      Would you like Fallow to resurface these seeds?
                    </p>
                    <div className="nc-resurface__actions">
                      <button
                        type="button"
                        className="nc-btn nc-btn--filled nc-btn--pill"
                        onClick={handleSecondYes}
                      >
                        <img src={yesIcon} alt="" width="16" height="16" />
                        Yes
                      </button>
                      <button
                        type="button"
                        className="nc-btn nc-btn--outline nc-btn--pill"
                      >
                        <img src={laterIcon} alt="" width="16" height="16" />
                        Later
                      </button>
                    </div>
                  </div>
                )}

                {step === 'resurfacing' && (
                  <div className="nc-loading">Resurfacing...</div>
                )}

                {step === 'resurfaced' && (
                  <div className="nc-fade-in nc-resurfaced-result">
                    <p className="nc-results-label">Seeds resurfaced</p>
                    <p className="nc-results-text">
                      Success! All relevant seeds resurfaced
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Bottom actions */}
            <div className="nc-actions">
              <button
                type="button"
                className="nc-btn nc-btn--discard"
                onClick={() => navigate('/conditions')}
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
              <button type="submit" className="nc-btn nc-btn--add">
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
          </form>
        </div>
      </div>
    </div>
  );
}
