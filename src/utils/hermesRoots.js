import { categoryColor } from '../data/categoryColors';
import { filterVisibleSeeds, readUserSeeds } from './seedStorage';

function getAllSeeds(seeds) {
  return filterVisibleSeeds(Array.isArray(seeds) ? seeds : readUserSeeds());
}

function getRootConnections(data) {
  if (Array.isArray(data?.connections)) return data.connections;
  if (Array.isArray(data?.connections?.connections)) return data.connections.connections;
  return null;
}

export function extractRootsForSeed(cached, seedId, seeds) {
  if (!cached) return null;
  const data = cached.data ?? cached;
  const allSeeds = getAllSeeds(seeds);
  const thisSeed = allSeeds.find((s) => s.id === seedId);
  if (!thisSeed) return null;

  // Pairwise format: { connections: [{ seed1: title, seed2: title, description }] }
  const pairwise = getRootConnections(data);
  if (Array.isArray(pairwise)) {
    const relevant = pairwise.filter(
      (c) => c.seed1 === thisSeed.title || c.seed2 === thisSeed.title,
    );
    if (relevant.length) {
      return relevant.map((c, i) => {
        const otherTitle = c.seed1 === thisSeed.title ? c.seed2 : c.seed1;
        const match = allSeeds.find((s) => s.title === otherTitle);
        if (!match) return null;
        return {
          id: match?.id || `r${i}`,
          title: otherTitle,
          color: categoryColor(match?.tags?.[0]),
          description: c.description,
        };
      }).filter(Boolean);
    }
  }

  // Thematic format (backwards compat): { analysis: { thematic_connections: [...] } }
  const thematic = data?.analysis?.thematic_connections;
  if (Array.isArray(thematic)) {
    const seen = new Set();
    const roots = [];
    thematic.forEach((theme) => {
      if (!Array.isArray(theme.connections)) return;
      if (!theme.connections.includes(thisSeed.title)) return;
      theme.connections.forEach((connTitle) => {
        if (connTitle === thisSeed.title || seen.has(connTitle)) return;
        seen.add(connTitle);
        const match = allSeeds.find((s) => s.title === connTitle);
        if (!match) return;
        roots.push({
          id: match?.id || connTitle,
          title: connTitle,
          color: categoryColor(match?.tags?.[0]),
          description: `${theme.theme}: ${theme.description}`,
        });
      });
    });
    if (roots.length) return roots;
  }

  // Flat array format: [{ seed1, seed2, description }] or [{ seeds: [...], description }]
  for (const key of ['roots', 'pairs', null]) {
    const arr = key ? data?.[key] : (Array.isArray(data) ? data : null);
    if (!Array.isArray(arr)) continue;
    const relevant = arr.filter((c) => {
      const ids = c.seeds || [c.seed1_id || c.seed1, c.seed2_id || c.seed2];
      return ids.includes(seedId) || ids.includes(thisSeed.title);
    });
    if (relevant.length) {
      return relevant.map((c, i) => {
        const ids = c.seeds || [c.seed1_id || c.seed1, c.seed2_id || c.seed2];
        const otherId = ids.find((id) => id !== seedId && id !== thisSeed.title);
        const match = allSeeds.find((s) => s.id === otherId || s.title === otherId);
        if (!match) return null;
        return {
          id: match?.id || otherId || `r${i}`,
          title: match?.title || otherId || `Seed ${i + 1}`,
          color: categoryColor(match?.tags?.[0]),
          description: c.description || c.reason || c.connection || '',
        };
      }).filter(Boolean);
    }
  }

  return null;
}

export function buildRootsDisplay(cached, seeds) {
  if (!cached) return [];
  const data = cached.data ?? cached;
  const allSeeds = getAllSeeds(seeds);
  const rootDate = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : new Date().toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      });

  // Pairwise format
  const pairwise = getRootConnections(data);
  if (Array.isArray(pairwise)) {
    const seedMap = {};
    pairwise.forEach((c) => {
      [[c.seed1, c.seed2], [c.seed2, c.seed1]].forEach(([title, otherTitle]) => {
        if (!seedMap[title]) seedMap[title] = { title, connections: [] };
        if (!seedMap[title].connections.find((x) => x.title === otherTitle)) {
          seedMap[title].connections.push({ title: otherTitle, explanation: c.description });
        }
      });
    });
    return Object.values(seedMap)
      .filter((e) => {
        const visibleTitle = allSeeds.some((seed) => seed.title === e.title);
        e.connections = e.connections.filter((conn) =>
          allSeeds.some((seed) => seed.title === conn.title),
        );
        return visibleTitle && e.connections.length > 0;
      })
      .map((entry, i) => ({
        id: i + 1,
        title: entry.title,
        color: allSeeds.find((s) => s.title === entry.title)?.tags?.[0]
          ? categoryColor(allSeeds.find((s) => s.title === entry.title).tags[0])
          : '#D5D0C5',
        rootCount: entry.connections.length,
        date: rootDate,
        expanded: i === 0,
        seeds: entry.connections.map((conn, j) => {
          const match = allSeeds.find((s) => s.title === conn.title);
          return {
            id: match?.id || j + 1,
            title: conn.title,
            tags: (match?.tags || []).map((tag) => ({ label: tag, color: categoryColor(tag) })),
            date: rootDate,
            explanation: conn.explanation,
          };
        }),
      }));
  }

  // Thematic format (backwards compat)
  const thematic = data?.analysis?.thematic_connections;
  if (Array.isArray(thematic)) {
    const seedMap = {};
    thematic.forEach((theme) => {
      if (!Array.isArray(theme.connections)) return;
      theme.connections.forEach((seedTitle) => {
        if (!seedMap[seedTitle]) seedMap[seedTitle] = { title: seedTitle, connections: [] };
        theme.connections.forEach((otherTitle) => {
          if (otherTitle === seedTitle) return;
          if (seedMap[seedTitle].connections.find((c) => c.title === otherTitle)) return;
          seedMap[seedTitle].connections.push({
            title: otherTitle,
            explanation: `${theme.theme}: ${theme.description}`,
          });
        });
      });
    });
    return Object.values(seedMap)
      .filter((e) => {
        const visibleTitle = allSeeds.some((seed) => seed.title === e.title);
        e.connections = e.connections.filter((conn) =>
          allSeeds.some((seed) => seed.title === conn.title),
        );
        return visibleTitle && e.connections.length > 0;
      })
      .map((entry, i) => {
        const match = allSeeds.find((s) => s.title === entry.title);
        return {
          id: i + 1,
          title: entry.title,
          color: categoryColor(match?.tags?.[0]),
          rootCount: entry.connections.length,
          date: rootDate,
          expanded: i === 0,
          seeds: entry.connections.map((conn, j) => {
            const connMatch = allSeeds.find((s) => s.title === conn.title);
            return {
              id: connMatch?.id || j + 1,
              title: conn.title,
              tags: (connMatch?.tags || []).map((tag) => ({ label: tag, color: categoryColor(tag) })),
              date: rootDate,
              explanation: conn.explanation,
            };
          }),
        };
      });
  }

  return [];
}
