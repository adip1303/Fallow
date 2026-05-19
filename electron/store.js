const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULT_PATH = path.join(app.getPath('userData'), 'fallow-store.json');

function getStorePath() {
  return process.env.FALLOW_STORE_PATH || DEFAULT_PATH;
}

function ensureStore() {
  const p = getStorePath();
  if (!fs.existsSync(p)) {
    const empty = {
      version: 1,
      seeds: [],
      conditions: [],
      branches: {},
      roots: {},
      conditionScans: {},
    };
    fs.writeFileSync(p, JSON.stringify(empty, null, 2), 'utf8');
    return empty;
  }
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error('[fallow-store] corrupt JSON, resetting:', e.message);
    const empty = {
      version: 1,
      seeds: [],
      conditions: [],
      branches: {},
      roots: {},
      conditionScans: {},
    };
    fs.writeFileSync(p, JSON.stringify(empty, null, 2), 'utf8');
    return empty;
  }
}

function writeStore(data) {
  const p = getStorePath();
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

// --- CRUD: Seeds ---

function listSeeds() {
  return ensureStore().seeds;
}

function getSeed(id) {
  return ensureStore().seeds.find((s) => s.id === id) || null;
}

function createSeed(seed) {
  const data = ensureStore();
  const newSeed = {
    id: seed.id || 'seed_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    title: seed.title || 'Untitled Seed',
    context: seed.context || '',
    tags: Array.isArray(seed.tags) ? seed.tags : [],
    blocker: seed.blocker || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  data.seeds.push(newSeed);
  writeStore(data);
  return newSeed;
}

function updateSeed(id, patch) {
  const data = ensureStore();
  const idx = data.seeds.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  data.seeds[idx] = { ...data.seeds[idx], ...patch, updatedAt: new Date().toISOString() };
  writeStore(data);
  return data.seeds[idx];
}

function deleteSeed(id) {
  const data = ensureStore();
  const len = data.seeds.length;
  data.seeds = data.seeds.filter((s) => s.id !== id);
  // also clean up derived data
  delete data.branches[id];
  // clean condition scans referencing this seed
  Object.keys(data.conditionScans).forEach((cid) => {
    if (data.conditionScans[cid]?.unblockedSeeds) {
      data.conditionScans[cid].unblockedSeeds = data.conditionScans[cid].unblockedSeeds.filter(
        (s) => s.id !== id
      );
    }
  });
  writeStore(data);
  return data.seeds.length !== len;
}

// --- CRUD: Conditions ---

function listConditions() {
  return ensureStore().conditions;
}

function getCondition(id) {
  return ensureStore().conditions.find((c) => c.id === id) || null;
}

function createCondition(condition) {
  const data = ensureStore();
  const newCond = {
    id: condition.id || 'cond_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    title: condition.title || 'Untitled Condition',
    context: condition.context || '',
    createdAt: new Date().toISOString(),
  };
  data.conditions.push(newCond);
  writeStore(data);
  return newCond;
}

function deleteCondition(id) {
  const data = ensureStore();
  const len = data.conditions.length;
  data.conditions = data.conditions.filter((c) => c.id !== id);
  delete data.conditionScans[id];
  writeStore(data);
  return data.conditions.length !== len;
}

// --- Results: Branches, Roots, ConditionScans ---

function setBranches(seedId, results) {
  const data = ensureStore();
  data.branches[seedId] = { results, updatedAt: new Date().toISOString() };
  writeStore(data);
}

function getBranches(seedId) {
  return ensureStore().branches[seedId] || null;
}

function setRoots(connections) {
  const data = ensureStore();
  data.roots = { connections, updatedAt: new Date().toISOString() };
  writeStore(data);
}

function getRoots() {
  return ensureStore().roots || null;
}

function setConditionScan(conditionId, unblockedSeeds) {
  const data = ensureStore();
  data.conditionScans[conditionId] = { unblockedSeeds, updatedAt: new Date().toISOString() };
  writeStore(data);
}

function getConditionScan(conditionId) {
  return ensureStore().conditionScans[conditionId] || null;
}

function rawStore() {
  return ensureStore();
}

function overwriteStore(data) {
  writeStore(data);
}

module.exports = {
  getStorePath,
  ensureStore,
  rawStore,
  overwriteStore,
  // seeds
  listSeeds,
  getSeed,
  createSeed,
  updateSeed,
  deleteSeed,
  // conditions
  listConditions,
  getCondition,
  createCondition,
  deleteCondition,
  // derived
  setBranches,
  getBranches,
  setRoots,
  getRoots,
  setConditionScan,
  getConditionScan,
};
