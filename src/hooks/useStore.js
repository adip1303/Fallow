import { useEffect, useState, useCallback } from 'react';
import { getStore, onStoreChanged, offStoreChanged } from '../services/store';
import { filterVisibleSeeds } from '../utils/seedStorage';

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function mapSeed(raw, branchesData) {
  const branchCount = branchesData?.[raw.id]?.results?.length ?? 0;
  return {
    id: raw.id,
    title: raw.title || '',
    desc: raw.context || '',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    branches: branchCount,
    added: fmtDate(raw.createdAt),
    blocker: raw.blocker || '',
    createdAt: raw.createdAt || '',
    updatedAt: raw.updatedAt || '',
  };
}

function mapCondition(raw) {
  return {
    id: raw.id,
    title: raw.title || '',
    context: raw.context || '',
    active: false,
    updated: fmtDate(raw.createdAt),
    affectedSeeds: [],
    createdAt: raw.createdAt || '',
  };
}

/**
 * Reads the shared Electron store and re-renders when Discord changes it.
 */
export function useStore() {
  const [data, setData] = useState({ seeds: [], conditions: [], branches: {}, roots: {}, conditionScans: {} });
  const [, setHiddenVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const raw = await getStore();
      setData({
        seeds: Array.isArray(raw.seeds) ? raw.seeds : [],
        conditions: Array.isArray(raw.conditions) ? raw.conditions : [],
        branches: raw.branches || {},
        roots: raw.roots || {},
        conditionScans: raw.conditionScans || {},
      });
      setReady(true);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    onStoreChanged(handler);
    return () => offStoreChanged(handler);
  }, [refresh]);

  useEffect(() => {
    const handler = () => setHiddenVersion((version) => version + 1);
    window.addEventListener('storage', handler);
    window.addEventListener('fallow:hiddenSeedsChanged', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('fallow:hiddenSeedsChanged', handler);
    };
  }, []);

  const seeds = filterVisibleSeeds(data.seeds.map((s) => mapSeed(s, data.branches)));
  const conditions = data.conditions.map(mapCondition);

  return { seeds, conditions, branches: data.branches, roots: data.roots, conditionScans: data.conditionScans, ready, error, refresh };
}

/**
 * Get a single seed from the store by ID.
 */
export function useStoreSeed(id) {
  const { seeds, ready } = useStore();
  return { seed: seeds.find((s) => s.id === id) || null, ready };
}
