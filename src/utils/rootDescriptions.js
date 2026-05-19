function seedTitle(seed, fallback = 'This seed') {
  return seed?.title || fallback;
}

function seedTags(seed) {
  if (Array.isArray(seed?.tags)) return seed.tags;
  if (Array.isArray(seed?.categories)) return seed.categories.map((cat) => cat.name).filter(Boolean);
  if (seed?.category?.name) return [seed.category.name];
  return [];
}

function seedContext(seed) {
  return seed?.context || seed?.desc || seed?.blocker || '';
}

function shortDetail(seed) {
  const text = seedContext(seed)
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  const sentence = text.match(/^[^.!?]+[.!?]?/)?.[0] || text;
  return sentence.length > 120 ? `${sentence.slice(0, 117).trim()}...` : sentence;
}

function normalizeDescription(description) {
  return String(description || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function needsPairSpecificRootDescription(description, seedA, seedB, duplicateCount = 1) {
  const normalized = normalizeDescription(description);
  if (!normalized) return true;
  if (duplicateCount > 1) return true;
  if (normalized.length < 36) return true;

  const titleA = seedTitle(seedA, '').toLowerCase();
  const titleB = seedTitle(seedB, '').toLowerCase();
  const namesBothSeeds = titleA && titleB && normalized.includes(titleA) && normalized.includes(titleB);
  return !namesBothSeeds && normalized.includes('both seeds');
}

export function buildPairSpecificRootDescription(seedA, seedB) {
  const titleA = seedTitle(seedA, 'One seed');
  const titleB = seedTitle(seedB, 'the other');
  const sharedTags = seedTags(seedA).filter((tag) => seedTags(seedB).includes(tag));
  const tagPhrase = sharedTags.length
    ? `their shared ${sharedTags.join(', ')} thread`
    : 'a shared underlying intent';
  const detailA = shortDetail(seedA);
  const detailB = shortDetail(seedB);

  if (detailA && detailB) {
    return `${titleA} and ${titleB} connect through ${tagPhrase}: ${titleA} centers on ${detailA}, while ${titleB} centers on ${detailB}`;
  }

  if (detailA || detailB) {
    const detail = detailA || detailB;
    return `${titleA} and ${titleB} connect through ${tagPhrase}, with the pair anchored by ${detail}`;
  }

  return `${titleA} and ${titleB} connect through ${tagPhrase}, giving this root its own link between those two seeds.`;
}

export function countRootDescriptions(roots, getSeeds = (root) => root.seeds || []) {
  const counts = new Map();
  roots.forEach((root) => {
    getSeeds(root).forEach((seed) => {
      const normalized = normalizeDescription(seed.explanation || seed.description);
      if (normalized) counts.set(normalized, (counts.get(normalized) || 0) + 1);
    });
  });
  return counts;
}
