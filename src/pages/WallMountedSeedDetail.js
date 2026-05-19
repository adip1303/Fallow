import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import returnIcon from '../icons/return.svg';
import moreIcon from '../icons/more.svg';
import revertIcon from '../icons/revert.svg';
import plantMedium from '../plants/plant-medium.gif';
import { categoryColor } from '../data/categoryColors';
import { getBranches, getRoots } from '../services/hermes';
import { extractRootsForSeed } from '../utils/hermesRoots';
import { notifyBranchLogChanged } from '../utils/branchLogNotifications';
import './SeedDetail.css';

const SEED_ID = 'a1';

const SEED = {
  id: SEED_ID,
  title: 'Wall-mounted Record Player',
  dateAdded: '27/04/2026',
  categories: [
    { name: 'Technology', color: categoryColor('Technology') },
    { name: 'Music', color: categoryColor('Music') },
  ],
  plant: plantMedium,
  context:
    "A wall-mounted record player designed for people who want to get into collecting and listening to music on records, but find themselves limited by space. The idea is to celebrate records like a form of art, by designing a frame that can be placed onto a wall, with the aesthetic of a picture frame. I was thinking about not including any in-built speakers so as to avoid any problems with vibrations affecting the music experience and quality. I'm also planning on designing it in a mix of functional minimalism (like the Scandinavian style of minimalism), and elements of design elegance (texturing, material choice, and surface design).",
  blocker:
    "I currently don't have access to a 3D modelling software to design the parts to visualize the record player properly.",
  media: [1, 2, 3],
};

export default function WallMountedSeedDetail() {
  const [updatedCondition, setUpdatedCondition] = useState(() => {
    if (localStorage.getItem('fallow:conditionsResetV3')) {
      const all = JSON.parse(localStorage.getItem('fallow:updatedConditions') || '{}');
      return all[SEED_ID] || null;
    }
    return null;
  });
  const [isReverted, setIsReverted] = useState(() => {
    const reverted = JSON.parse(localStorage.getItem('fallow:revertedConditions') || '{}');
    return !!reverted[SEED_ID];
  });

  useEffect(() => {
    if (localStorage.getItem('fallow:conditionsResetV3')) return;
    localStorage.removeItem('fallow:updatedConditions');
    localStorage.removeItem('fallow:resurfacedSeeds');
    localStorage.removeItem('fallow:conditions');
    localStorage.removeItem('fallow:revertedConditions');
    localStorage.setItem('fallow:conditionsResetV3', '1');
    setUpdatedCondition(null);
    setIsReverted(false);
  }, []);

  const [rootsList, setRootsList] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('fallow:roots') || 'null');
      const extracted = extractRootsForSeed(cached, SEED_ID);
      if (extracted?.length) return extracted;
    } catch {}
    return [];
  });

  const [likedBranches, setLikedBranches] = useState(() => {
    const stored = JSON.parse(localStorage.getItem('fallow:likedBranches') || '{}');
    return Object.values(stored).find((e) => e.seedTitle === SEED.title)?.branches || [];
  });
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState(null);
  const [rootsLoading, setRootsLoading] = useState(false);
  const [rootsError, setRootsError] = useState(null);
  const [rootsDone, setRootsDone] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showGradient, setShowGradient] = useState(true);
  const cardRef = useRef(null);
  const returnRef = useRef(null);

  useEffect(() => {
    function onStorage(e) {
      if (e.key !== 'fallow:roots') return;
      try {
        const cached = JSON.parse(e.newValue || 'null');
        const extracted = extractRootsForSeed(cached, SEED_ID);
        if (extracted?.length) setRootsList(extracted);
      } catch {}
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

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

  const findRoots = async () => {
    setRootsLoading(true);
    setRootsError(null);
    setRootsDone(false);
    try {
      const allSeeds = JSON.parse(localStorage.getItem('fallow:userSeeds') || '[]');
      const result = await getRoots(
        allSeeds.map((s) => ({
          id: s.id,
          title: s.title,
          tags: s.tags || [],
          context: s.context || s.desc || '',
        })),
        { focusSeed: { title: SEED.title } }
      );
      localStorage.setItem('fallow:roots', JSON.stringify(result));
      const extracted = extractRootsForSeed(result, SEED_ID);
      setRootsList(extracted || []);
      setRootsDone(true);
    } catch (e) {
      setRootsError(e.message);
    } finally {
      setRootsLoading(false);
    }
  };

  const searchBranches = async () => {
    setBranchesLoading(true);
    setBranchesError(null);
    setSearchDone(false);
    try {
      const dislikes = JSON.parse(localStorage.getItem('fallow:dislikes') || '{}');
      const result = await getBranches(
        { id: SEED_ID, title: SEED.title, context: SEED.context, tags: ['Music', 'Technology'] },
        { specificRequest: searchQuery || undefined, dislikes: dislikes[SEED.title] || [] },
      );
      const fetched = result.results ?? result;
      const stored = JSON.parse(localStorage.getItem('fallow:likedBranches') || '{}');
      setLikedBranches(
        Object.values(stored).find((e) => e.seedTitle === SEED.title)?.branches || [],
      );
      const log = JSON.parse(localStorage.getItem('fallow:branchLog') || '[]');
      const entry = {
        seedId: SEED_ID,
        seedTitle: SEED.title,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        branches: fetched,
      };
      const idx = log.findIndex((e) => e.seedId === SEED_ID);
      if (idx >= 0) log[idx] = entry; else log.unshift(entry);
      localStorage.setItem('fallow:branchLog', JSON.stringify(log));
      notifyBranchLogChanged();
      setSearchDone(true);
    } catch (e) {
      setBranchesError(e.message);
    } finally {
      setBranchesLoading(false);
    }
  };

  const currentCondition = updatedCondition && !isReverted ? updatedCondition.text : SEED.blocker;

  return (
    <div className="page seed-page">
      <div className="seed-card-wrapper">
        <div className="seed-card" ref={cardRef}>
          <div className="seed-header">
            <div className="seed-header__left">
              <h1 className="seed-title">{SEED.title}</h1>
              <div className="seed-date">Date Added: {SEED.dateAdded}</div>
              <div className="seed-meta">
                {SEED.categories.map((cat, i) => (
                  <span key={cat.name} className="seed-category" style={{ background: cat.color }}>
                    {cat.name}
                  </span>
                ))}
                <span className="seed-meta-divider">|</span>
                <span>Branches: {likedBranches.length}</span>
                <span className="seed-meta-divider">|</span>
                <span>Roots: {rootsList.length}</span>
              </div>
            </div>
            <div className="seed-header__right">
              <div className="seed-plant-preview">
                <img src={SEED.plant} alt="" />
              </div>
              <button className="seed-more-btn" aria-label="More options" type="button">
                <img src={moreIcon} alt="" width="16" height="16" />
              </button>
            </div>
          </div>

          <div className="seed-divider" />

          <div className="seed-body">
            <section className="seed-section">
              <h2 className="seed-section__label">Context:</h2>
              <div className="seed-text-box">{SEED.context}</div>
            </section>

            <section className="seed-section">
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
                      className="seed-revert-btn"
                      onClick={() => {
                        const next = !isReverted;
                        setIsReverted(next);
                        const map = JSON.parse(localStorage.getItem('fallow:revertedConditions') || '{}');
                        if (next) map[SEED_ID] = true;
                        else delete map[SEED_ID];
                        localStorage.setItem('fallow:revertedConditions', JSON.stringify(map));
                      }}
                    >
                      <img src={revertIcon} alt="" width="14" height="14" />
                      {isReverted ? 'Apply Update' : 'Revert'}
                    </button>
                  </>
                ) : (
                  <h2 className="seed-section__label">What&apos;s blocking you right now?</h2>
                )}
              </div>
              <div className="seed-text-box">{currentCondition}</div>
            </section>

            <section className="seed-section">
              <h2 className="seed-section__label">Media and Links:</h2>
              <div className="seed-thumbs-row">
                {SEED.media.map((_, i) => (
                  <div key={i} className="seed-thumb-placeholder seed-thumb-placeholder--square" />
                ))}
              </div>
            </section>

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
                <p className="seed-branches-done">Done! Relevant branches are now updated in Activity.</p>
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
                {rootsList.map((root) => (
                  <div key={root.id} className="seed-root-card">
                    <div className="seed-root-card__header" style={{ background: root.color }}>
                      {root.title}
                    </div>
                    <div className="seed-root-card__body">{root.description}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="seed-footer" ref={returnRef}>
            <Link to="/garden" className="seed-return-btn">
              <img src={returnIcon} alt="" width="14" height="14" />
              Return
            </Link>
          </div>
        </div>
        {showGradient && <div className="seed-gradient-fade" aria-hidden="true" />}
      </div>
    </div>
  );
}
