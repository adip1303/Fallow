import iconSearch from '../icons/search.svg';
import iconDropdown from '../icons/dropdown.svg';
import './Garden.css';

const SORT_OPTIONS = ['Most Recent', 'Oldest', 'Most Branches', 'Title (A-Z)'];

export default function EmptyGarden() {
  return (
    <div className="garden">
      <div className="garden__top">
        <div className="garden__search">
          <img className="garden__search-icon" src={iconSearch} alt="" />
          <input
            className="garden__search-input"
            type="text"
            placeholder="Search your seeds..."
            aria-label="Search seeds"
            readOnly
          />
        </div>
        <div className="garden__sort">
          <span className="garden__sort-label">Sort By:</span>
          <button
            type="button"
            className="garden__sort-trigger"
            aria-label="Sort seeds"
            aria-haspopup="listbox"
            aria-expanded="false"
          >
            <span>Most Recent</span>
            <img className="garden__sort-icon" src={iconDropdown} alt="" />
          </button>
          <div className="garden__sort-menu" role="listbox" aria-hidden="true">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={option === 'Most Recent'}
                tabIndex={-1}
                className={`garden__sort-option${option === 'Most Recent' ? ' is-selected' : ''}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="garden__empty">
        <p className="garden__empty-soft">Your garden's looking a little empty</p>
        <p className="garden__empty-cta">Add a seed to start off!</p>
      </div>
    </div>
  );
}
