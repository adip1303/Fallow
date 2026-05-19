import { useEffect, useRef, useState } from 'react';
import { getRoots, checkConditions } from '../services/hermes';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Background poll for Roots + Conditions.
 *
 * @param {Array} seeds  - full seed list (needs id, title, tags, context, blocker)
 * @param {Array} conditions - active conditions array (needs title, context)
 * @returns {{ roots, conditionResults, loading, error, lastPolled }}
 */
export function useHermesPolling(seeds, conditions = []) {
  const [roots, setRoots] = useState(null);
  const [conditionResults, setConditionResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastPolled, setLastPolled] = useState(null);
  const timerRef = useRef(null);

  async function poll() {
    if (!window.fallow?.hermesChat) return; // silently skip outside Electron
    if (!seeds?.length) return;

    setLoading(true);
    setError(null);

    try {
      const tasks = [getRoots(seeds)];
      if (conditions.length) {
        conditions.forEach((c) => tasks.push(checkConditions(c, seeds)));
      }

      const results = await Promise.allSettled(tasks);

      const [rootsResult, ...condResults] = results;
      if (rootsResult.status === 'fulfilled') setRoots(rootsResult.value);

      const fulfilled = condResults
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value);
      if (fulfilled.length) setConditionResults(fulfilled);

      setLastPolled(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { roots, conditionResults, loading, error, lastPolled };
}
