export const BRANCH_LOG_KEY = 'fallow:branchLog';
export const BRANCH_LOG_SEEN_KEY = 'fallow:branchLogSeen';
export const BRANCH_LOG_CHANGED_EVENT = 'fallow:branchLogChanged';

export function readBranchLog() {
  try {
    const raw = JSON.parse(localStorage.getItem(BRANCH_LOG_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function branchSignature(branch) {
  if (!branch) return '';
  return [
    branch.id,
    branch.url,
    branch.title,
    branch.source || branch.publisher,
  ].filter(Boolean).join('|');
}

export function entrySignature(entry) {
  const branches = Array.isArray(entry?.branches) ? entry.branches : [];
  return [
    entry?.seedId || entry?.seedTitle || '',
    entry?.date || '',
    branches.length,
    branches.map(branchSignature).join('~'),
  ].join('::');
}

export function readSeenBranchLog() {
  try {
    const raw = JSON.parse(localStorage.getItem(BRANCH_LOG_SEEN_KEY) || '{}');
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  } catch {
    return {};
  }
}

export function branchLogNotificationCount(log = readBranchLog()) {
  const seen = readSeenBranchLog();
  const unseenSeedIds = new Set();
  log.forEach((entry) => {
    const seedKey = String(entry?.seedId || entry?.seedTitle || '');
    if (!seedKey) return;
    if (seen[seedKey] !== entrySignature(entry)) {
      unseenSeedIds.add(seedKey);
    }
  });
  return unseenSeedIds.size;
}

export function markBranchLogSeen(log = readBranchLog()) {
  const seen = {};
  log.forEach((entry) => {
    const seedKey = String(entry?.seedId || entry?.seedTitle || '');
    if (!seedKey) return;
    seen[seedKey] = entrySignature(entry);
  });
  localStorage.setItem(BRANCH_LOG_SEEN_KEY, JSON.stringify(seen));
  notifyBranchLogChanged('seen');
}

export function notifyBranchLogChanged(source = 'log') {
  window.dispatchEvent(new CustomEvent(BRANCH_LOG_CHANGED_EVENT, { detail: { source } }));
}
