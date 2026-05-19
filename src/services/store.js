/**
 * Renderer-side store API.
 * Wraps the Electron preload bridge. Gracefully degrades outside Electron.
 */

export async function getStorePath() {
  if (!window.fallow?.storePath) return null;
  return window.fallow.storePath();
}

export async function getStore() {
  if (!window.fallow?.storeRead) {
    console.warn('[store] Not running in Electron — returning empty store');
    return { version: 1, seeds: [], conditions: [], branches: {}, roots: {}, conditionScans: {} };
  }
  return window.fallow.storeRead();
}

export async function setStore(data) {
  if (!window.fallow?.storeWrite) return;
  return window.fallow.storeWrite(data);
}

// --- Seeds ---

export async function listSeeds() {
  if (!window.fallow?.listSeeds) return [];
  return window.fallow.listSeeds();
}

export async function getSeed(id) {
  if (!window.fallow?.getSeed) return null;
  return window.fallow.getSeed(id);
}

export async function createSeed(seed) {
  if (!window.fallow?.createSeed) return null;
  return window.fallow.createSeed(seed);
}

export async function updateSeed(id, patch) {
  if (!window.fallow?.updateSeed) return null;
  return window.fallow.updateSeed(id, patch);
}

export async function deleteSeed(id) {
  if (!window.fallow?.deleteSeed) return false;
  return window.fallow.deleteSeed(id);
}

// --- Conditions ---

export async function listConditions() {
  if (!window.fallow?.listConditions) return [];
  return window.fallow.listConditions();
}

export async function getCondition(id) {
  if (!window.fallow?.getCondition) return null;
  return window.fallow.getCondition(id);
}

export async function createCondition(condition) {
  if (!window.fallow?.createCondition) return null;
  return window.fallow.createCondition(condition);
}

export async function deleteCondition(id) {
  if (!window.fallow?.deleteCondition) return false;
  return window.fallow.deleteCondition(id);
}

// --- Derived results ---

export async function getBranchesResult(seedId) {
  if (!window.fallow?.getBranches) return null;
  return window.fallow.getBranches(seedId);
}

export async function setBranchesResult(seedId, results) {
  if (!window.fallow?.setBranches) return;
  return window.fallow.setBranches(seedId, results);
}

export async function getRootsResult() {
  if (!window.fallow?.getRoots) return null;
  return window.fallow.getRoots();
}

export async function setRootsResult(connections) {
  if (!window.fallow?.setRoots) return;
  return window.fallow.setRoots(connections);
}

export async function getConditionScanResult(conditionId) {
  if (!window.fallow?.getConditionScan) return null;
  return window.fallow.getConditionScan(conditionId);
}

export async function setConditionScanResult(conditionId, results) {
  if (!window.fallow?.setConditionScan) return;
  return window.fallow.setConditionScan(conditionId, results);
}

// --- Watcher ---

export function onStoreChanged(callback) {
  if (!window.fallow?.onStoreChanged) return;
  window.fallow.onStoreChanged(callback);
}

export function offStoreChanged(callback) {
  if (!window.fallow?.offStoreChanged) return;
  window.fallow.offStoreChanged(callback);
}
