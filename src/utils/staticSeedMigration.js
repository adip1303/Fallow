import { SEEDS } from '../data/seeds';
import { readUserSeeds, writeUserSeeds } from './seedStorage';

const STATIC_SEEDS_MIGRATION_KEY = 'fallow:staticSeedsMigrated:v1';
const EMPTY_FIRST_RUN_KEY = 'fallow:emptyFirstRunInitialized:v1';

const FALLOW_STATE_KEYS = [
  'fallow:userSeeds',
  'fallow:hiddenSeeds',
  'fallow:conditions',
  'fallow:branches',
  'fallow:roots',
  'fallow:customCategories',
  'fallow:branchLog',
  'fallow:branchLogSeen',
  'fallow:likedBranches',
  'fallow:dislikes',
  'fallow:updatedConditions',
  'fallow:resurfacedSeeds',
  'fallow:revertedConditions',
  'fallow:conditionRevertDone',
  'fallow:conditionsResetV3',
];

function parseAddedDate(added) {
  if (!added) return '';
  const [day, month, year] = added.split('/').map(Number);
  if (!day || !month || !year) return '';
  return new Date(year, month - 1, day).toISOString();
}

function seedFromStatic(seed) {
  const createdAt = parseAddedDate(seed.added);
  return {
    ...seed,
    context: seed.context || seed.desc || '',
    media: seed.media || [],
    createdAt: seed.createdAt || createdAt,
    updatedAt: seed.updatedAt || createdAt,
  };
}

function storeHasData(store) {
  if (!store || typeof store !== 'object') return false;
  return Boolean(
    store.seeds?.length
    || store.conditions?.length
    || Object.keys(store.branches || {}).length
    || Object.keys(store.roots || {}).length
    || Object.keys(store.conditionScans || {}).length
  );
}

async function hasInitializedElectronStore() {
  if (!window.fallow?.storeRead) return false;
  try {
    return storeHasData(await window.fallow.storeRead());
  } catch {
    return false;
  }
}

function initializeEmptyFirstRun() {
  FALLOW_STATE_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.setItem(EMPTY_FIRST_RUN_KEY, 'true');
  localStorage.setItem(STATIC_SEEDS_MIGRATION_KEY, 'true');
}

export async function migrateStaticSeedsToLocalStorage() {
  if (localStorage.getItem(STATIC_SEEDS_MIGRATION_KEY)) return;

  if (!(await hasInitializedElectronStore())) {
    initializeEmptyFirstRun();
    return;
  }

  if (!localStorage.getItem(EMPTY_FIRST_RUN_KEY)) {
    localStorage.setItem(EMPTY_FIRST_RUN_KEY, 'true');
  }

  const savedSeeds = readUserSeeds();
  const savedIds = new Set(savedSeeds.map((seed) => String(seed.id)));
  const migratedSeeds = SEEDS
    .filter((seed) => !savedIds.has(String(seed.id)))
    .map(seedFromStatic);

  if (migratedSeeds.length) {
    writeUserSeeds([...migratedSeeds, ...savedSeeds]);
  }

  localStorage.setItem(STATIC_SEEDS_MIGRATION_KEY, 'true');
}
