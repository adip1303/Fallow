export const USER_SEEDS_KEY = 'fallow:userSeeds';
export const HIDDEN_SEEDS_KEY = 'fallow:hiddenSeeds';

export function readUserSeeds() {
  try {
    const raw = JSON.parse(localStorage.getItem(USER_SEEDS_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function writeUserSeeds(seeds) {
  localStorage.setItem(USER_SEEDS_KEY, JSON.stringify(seeds));
}

export function readHiddenSeedIds() {
  try {
    const raw = JSON.parse(localStorage.getItem(HIDDEN_SEEDS_KEY) || '[]');
    return new Set((Array.isArray(raw) ? raw : []).map((id) => String(id)));
  } catch {
    return new Set();
  }
}

export function isSeedHidden(seedOrId) {
  const id = typeof seedOrId === 'object' ? seedOrId?.id : seedOrId;
  if (id === undefined || id === null) return false;
  return readHiddenSeedIds().has(String(id));
}

export function filterVisibleSeeds(seeds) {
  const hiddenIds = readHiddenSeedIds();
  return seeds.filter((seed) => seed?.id !== undefined && !hiddenIds.has(String(seed.id)));
}

export function hideSeed(seedId) {
  if (seedId === undefined || seedId === null) return;
  const hiddenIds = readHiddenSeedIds();
  hiddenIds.add(String(seedId));
  localStorage.setItem(HIDDEN_SEEDS_KEY, JSON.stringify(Array.from(hiddenIds)));
  window.dispatchEvent(new Event('fallow:hiddenSeedsChanged'));
}
