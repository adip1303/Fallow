import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import deleteIcon from '../icons/delete.svg';
import addIcon from '../icons/add.svg';
import dropdownIcon from '../icons/dropdown.svg';
import {
  CATEGORIES_CHANGED_EVENT,
  CATEGORY_COLORS,
  CUSTOM_CATEGORIES_KEY,
  readCustomCategories,
} from '../data/categoryColors';
import './NewCategory.css';

const PALETTE = Array.from(new Set([
  ...Object.values(CATEGORY_COLORS),
  '#E480A6', '#D4A56A', '#84A4C9', '#89CDD4',
  '#A27FD3', '#5B9165', '#6DBEB4', '#D4635A',
]));

export default function NewCategory() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  function handleSubmit(e) {
    e.preventDefault();
    const name = title.trim();
    if (!name) return;
    const now = new Date().toISOString();
    const saved = readCustomCategories();
    const existingIndex = saved.findIndex((category) => category.name.toLowerCase() === name.toLowerCase());
    const category = {
      id: existingIndex >= 0 ? saved[existingIndex].id : `cat_${Date.now()}`,
      name,
      color: selectedColor || '#D5D0C5',
      context: context.trim(),
      createdAt: existingIndex >= 0 ? saved[existingIndex].createdAt : now,
      updatedAt: now,
    };
    const next = existingIndex >= 0
      ? saved.map((item, index) => (index === existingIndex ? category : item))
      : [...saved, category];
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CATEGORIES_CHANGED_EVENT));
    navigate('/categories');
  }

  return (
    <div className="page nc2-page">
      <div className="nc2-wrapper">
        <div className="nc2-card">
          <h1 className="nc2-title">New Category</h1>

          <form onSubmit={handleSubmit} className="nc2-form">
            {/* Row: Title + Color */}
            <div className="nc2-row">
              <div className="nc2-field nc2-field--wide">
                <label className="nc2-label">Title:</label>
                <input
                  className="nc2-input"
                  placeholder="Add a title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="nc2-field nc2-field--narrow" ref={dropdownRef}>
                <label className="nc2-label">Category Color:</label>
                <button
                  type="button"
                  className={`nc2-color-trigger${selectedColor ? ' is-filled' : ''}`}
                  style={selectedColor ? { background: selectedColor } : {}}
                  onClick={() => setDropdownOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={dropdownOpen}
                >
                  {!selectedColor && (
                    <>
                      <span className="nc2-color-trigger__text">Select color</span>
                      <img
                        src={dropdownIcon}
                        alt=""
                        className={`nc2-color-trigger__icon${dropdownOpen ? ' is-open' : ''}`}
                        width="12"
                        height="12"
                      />
                    </>
                  )}
                </button>

                <div
                  className={`nc2-color-dropdown${dropdownOpen ? ' is-open' : ''}`}
                  role="listbox"
                  aria-hidden={!dropdownOpen}
                >
                  <div className="nc2-color-grid">
                    {PALETTE.map((color) => (
                      <button
                        key={color}
                        type="button"
                        role="option"
                        aria-selected={selectedColor === color}
                        tabIndex={dropdownOpen ? 0 : -1}
                        className={`nc2-swatch${selectedColor === color ? ' is-selected' : ''}`}
                        style={{ background: color }}
                        onClick={() => {
                          setSelectedColor(color);
                          setDropdownOpen(false);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Context */}
            <div className="nc2-field">
              <label className="nc2-label">Context:</label>
              <textarea
                className="nc2-textarea"
                placeholder=""
                value={context}
                onChange={(e) => setContext(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="nc2-actions">
              <button
                type="button"
                className="nc2-btn nc2-btn--discard"
                onClick={() => navigate('/categories')}
              >
                <img src={deleteIcon} alt="" width="16" height="16" style={{ display: 'block' }} />
                Discard Entry
              </button>
              <button type="submit" className="nc2-btn nc2-btn--add">
                <img src={addIcon} alt="" width="16" height="16" style={{ display: 'block' }} />
                Add Category
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
